import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authClient as supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sending, setSending] = useState({})
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState({ total: 0, unpaid: 0, paid: 0, overdue: 0, revenue: 0 })

  useEffect(() => { loadInvoices() }, [])

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`*, registrations ( contact_name, contact_email, company, registration_type, team_name, amount_due, status, events ( title, event_date, slug ) )`)
      .order('created_at', { ascending: false })

    if (error) { toast.error('Failed to load invoices'); return }

    const now = new Date()
    let unpaid = 0, paid = 0, overdue = 0, revenue = 0
    ;(data || []).forEach(inv => {
      if (inv.status === 'paid') { paid++; revenue += Number(inv.amount_due) }
      else if (inv.status === 'unpaid') { unpaid++; if (inv.due_date && new Date(inv.due_date) < now) overdue++ }
    })

    setStats({ total: data?.length || 0, unpaid, paid, overdue, revenue })
    setInvoices(data || [])
    setLoading(false)
  }

  const generateMissingInvoices = async () => {
    if (!window.confirm("Generate invoices for all registrations that don't have one yet?")) return
    setGenerating(true)
    try {
      const { data: allRegs } = await supabase.from('registrations').select('id, amount_due, events(payment_deadline)')
      const { data: existing } = await supabase.from('invoices').select('registration_id')
      const existingIds = new Set((existing || []).map(i => i.registration_id))
      const missing = (allRegs || []).filter(r => !existingIds.has(r.id))

      if (missing.length === 0) { toast.success('All registrations already have invoices!'); setGenerating(false); return }

      let created = 0
      for (const reg of missing) {
        const { error } = await supabase.from('invoices').insert({
          registration_id: reg.id, amount_due: reg.amount_due, status: 'unpaid',
          due_date: reg.events?.payment_deadline || null,
        })
        if (!error) created++
      }
      toast.success(`Generated ${created} invoice${created !== 1 ? 's' : ''}!`)
      loadInvoices()
    } catch (err) {
      toast.error(err.message || 'Failed to generate invoices')
    } finally { setGenerating(false) }
  }

  const [editAmount, setEditAmount] = useState(null) // { id, invoice_number, amount_due }
  const [fixingZero, setFixingZero] = useState(false)

  const fixZeroInvoices = async () => {
    if (!window.confirm('Update all R0 invoices with the correct amount from their event pricing?')) return
    setFixingZero(true)
    try {
      // Get R0 invoices with their registration + event pricing
      const { data: zeroInvs } = await supabase
        .from('invoices')
        .select(`id, registration_id, registrations(registration_type, amount_due, events(fourball_price, individual_price))`)
        .eq('amount_due', 0)
        .not('registration_id', 'is', null)

      let fixed = 0
      for (const inv of zeroInvs || []) {
        const reg = inv.registrations
        const event = reg?.events
        const correctAmount = reg?.registration_type === 'fourball'
          ? Number(event?.fourball_price || 0)
          : Number(event?.individual_price || 0)
        if (correctAmount > 0) {
          await supabase.from('invoices').update({ amount_due: correctAmount }).eq('id', inv.id)
          // Also fix the registration amount_due
          await supabase.from('registrations').update({ amount_due: correctAmount }).eq('id', inv.registration_id)
          fixed++
        }
      }
      toast.success(`Fixed ${fixed} invoice${fixed !== 1 ? 's' : ''}!`)
      loadInvoices()
    } catch (err) {
      toast.error(err.message || 'Failed to fix invoices')
    } finally { setFixingZero(false) }
  }

  const saveEditAmount = async () => {
    if (!editAmount.amount_due || Number(editAmount.amount_due) < 0) return toast.error('Enter a valid amount')
    const { error } = await supabase.from('invoices').update({ amount_due: Number(editAmount.amount_due) }).eq('id', editAmount.id)
    if (error) return toast.error(error.message)
    toast.success('Amount updated')
    setEditAmount(null)
    loadInvoices()
  }

  const markPaid = async (inv) => {
    if (!window.confirm(`Mark ${inv.invoice_number} as paid?`)) return
    const { error } = await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', inv.id)
    if (error) return toast.error('Failed to update')
    toast.success('Marked as paid')
    loadInvoices()
  }

  const sendReminder = async (inv) => {
    if (!window.confirm(`Send reminder to ${inv.registrations?.contact_email}?`)) return
    setSending(s => ({ ...s, [inv.id]: true }))
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-reminder`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: inv.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('Reminder sent!')
      loadInvoices()
    } catch (err) {
      toast.error(err.message || 'Failed to send reminder')
    } finally { setSending(s => ({ ...s, [inv.id]: false })) }
  }

  const filtered = invoices.filter(inv => {
    if (filter === 'unpaid') return inv.status === 'unpaid'
    if (filter === 'paid') return inv.status === 'paid'
    if (filter === 'overdue') return inv.status === 'unpaid' && inv.due_date && new Date(inv.due_date) < new Date()
    return true
  })

  const isOverdue = (inv) => inv.status === 'unpaid' && inv.due_date && new Date(inv.due_date) < new Date()

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1>Invoices</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={fixZeroInvoices} disabled={fixingZero}>
              {fixingZero ? 'Fixing...' : '🔧 Fix R0 Invoices'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={generateMissingInvoices} disabled={generating}>
              {generating ? 'Generating...' : '⚡ Generate Missing Invoices'}
            </button>
          </div>
        </div>

        <div className="grid-4 mb-4">
          {[
            { label: 'Total Invoices', value: stats.total, color: 'var(--text)' },
            { label: 'Unpaid', value: stats.unpaid, color: 'var(--yellow)' },
            { label: 'Overdue', value: stats.overdue, color: 'var(--red)' },
            { label: 'Revenue Collected', value: `R${stats.revenue.toLocaleString()}`, color: 'var(--green)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="tabs mb-4">
          {[{ key: 'all', label: 'All' }, { key: 'unpaid', label: 'Unpaid' }, { key: 'overdue', label: 'Overdue' }, { key: 'paid', label: 'Paid' }].map(t => (
            <button key={t.key} className={`tab ${filter === t.key ? 'active' : ''}`} onClick={() => setFilter(t.key)}>{t.label}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🧾</div><p>No invoices found.</p></div>
        ) : (
          <>
            <div className="table-wrap card hide-mobile" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th><th>Name</th><th>Event</th><th>Amount</th><th>Due Date</th><th>Reminders</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const reg = inv.registrations
                    const overdue = isOverdue(inv)
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.82rem' }}>{inv.invoice_number}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{reg?.contact_name}</div>
                          {reg?.company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reg.company}</div>}
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.82rem' }}>{reg?.events?.title}</td>
                        <td style={{ fontWeight: 700 }}>R{Number(inv.amount_due).toLocaleString()}</td>
                        <td style={{ fontSize: '0.82rem', color: overdue ? 'var(--red)' : 'var(--text-muted)' }}>
                          {inv.due_date ? format(new Date(inv.due_date), 'd MMM yyyy') : '—'}
                          {overdue && <div style={{ fontSize: '0.7rem' }}>OVERDUE</div>}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                          {inv.reminder_count > 0 ? <div>{inv.reminder_count}x {inv.last_reminder_at && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{format(new Date(inv.last_reminder_at), 'd MMM')}</div>}</div> : '—'}
                        </td>
                        <td>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-confirmed' : overdue ? 'badge-cancelled' : 'badge-pending'}`}>
                            {inv.status === 'paid' ? 'Paid' : overdue ? 'Overdue' : 'Unpaid'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <Link to={`/admin/invoices/${inv.id}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>View</Link>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditAmount({ id: inv.id, invoice_number: inv.invoice_number, amount_due: inv.amount_due })}>✏️</button>
                            {inv.status === 'unpaid' && (
                              <>
                                <button className="btn btn-outline btn-sm" onClick={() => sendReminder(inv)} disabled={sending[inv.id]}>{sending[inv.id] ? '...' : '📧'}</button>
                                <button className="btn btn-primary btn-sm" onClick={() => markPaid(inv)}>Paid ✓</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="show-mobile" style={{ flexDirection: 'column', gap: 12 }}>
              {filtered.map(inv => {
                const reg = inv.registrations
                const overdue = isOverdue(inv)
                return (
                  <div key={inv.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--purple)' }}>{inv.invoice_number}</div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>{reg?.contact_name}</div>
                        {reg?.company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reg.company}</div>}
                      </div>
                      <span className={`badge ${inv.status === 'paid' ? 'badge-confirmed' : overdue ? 'badge-cancelled' : 'badge-pending'}`}>
                        {inv.status === 'paid' ? 'Paid' : overdue ? 'Overdue' : 'Unpaid'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{reg?.events?.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gold)' }}>R{Number(inv.amount_due).toLocaleString()}</span>
                      <span style={{ fontSize: '0.78rem', color: overdue ? 'var(--red)' : 'var(--text-muted)' }}>
                        {inv.due_date ? `Due ${format(new Date(inv.due_date), 'd MMM yyyy')}` : ''}{overdue && ' · OVERDUE'}
                      </span>
                    </div>
                    {inv.reminder_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                        {inv.reminder_count} reminder{inv.reminder_count > 1 ? 's' : ''} sent{inv.last_reminder_at && ` · last ${format(new Date(inv.last_reminder_at), 'd MMM')}`}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to={`/admin/invoices/${inv.id}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>View</Link>
                      {inv.status === 'unpaid' && (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => sendReminder(inv)} disabled={sending[inv.id]} style={{ flex: 1 }}>{sending[inv.id] ? 'Sending...' : 'Send Reminder'}</button>
                          <button className="btn btn-primary btn-sm" onClick={() => markPaid(inv)} style={{ flex: 1 }}>Mark Paid</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Amount Modal */}
      {editAmount && (
        <div className="modal-overlay" onClick={() => setEditAmount(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>Edit Amount</h2>
              <button onClick={() => setEditAmount(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16, fontFamily: 'monospace' }}>{editAmount.invoice_number}</div>
            <div className="form-group">
              <label className="form-label">Amount Due (R)</label>
              <input
                className="form-input"
                type="number"
                value={editAmount.amount_due}
                onChange={e => setEditAmount(a => ({ ...a, amount_due: e.target.value }))}
                autoFocus
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveEditAmount}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
