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
  const [fixingZero, setFixingZero] = useState(false)
  const [editAmount, setEditAmount] = useState(null)
  const [stats, setStats] = useState({ total: 0, unpaid: 0, paid: 0, overdue: 0, revenue: 0 })

  useEffect(() => { loadInvoices() }, [])

  const loadInvoices = async () => {
    // Try with sponsor join first, fall back if column doesn't exist yet
    let data, error
    ;({ data, error } = await supabase
      .from('invoices')
      .select(`*, registrations ( contact_name, contact_email, company, registration_type, team_name, amount_due, status, events ( title, event_date ) ), sponsor_registrations ( contact_name, contact_email, company_name, amount_due, status, events ( title, event_date ), sponsor_packages ( name ) )`)
      .order('created_at', { ascending: false }))

    if (error) {
      // Fall back without sponsor join (migration not run yet)
      ;({ data, error } = await supabase
        .from('invoices')
        .select(`*, registrations ( contact_name, contact_email, company, registration_type, team_name, amount_due, status, events ( title, event_date ) )`)
        .order('created_at', { ascending: false }))
    }

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
    if (!window.confirm("Generate invoices for all registrations and sponsors that don't have one yet?")) return
    setGenerating(true)
    try {
      let created = 0

      // 1. Regular registrations
      const { data: allRegs } = await supabase.from('registrations').select('id, amount_due, events(payment_deadline)')
      const { data: existingRegInvs } = await supabase.from('invoices').select('registration_id').not('registration_id', 'is', null)
      const existingRegIds = new Set((existingRegInvs || []).map(i => i.registration_id))
      const missingRegs = (allRegs || []).filter(r => !existingRegIds.has(r.id))
      for (const reg of missingRegs) {
        const { error } = await supabase.from('invoices').insert({
          registration_id: reg.id,
          amount_due: reg.amount_due,
          status: Number(reg.amount_due) === 0 ? 'complimentary' : 'unpaid',
          due_date: reg.events?.payment_deadline || null,
        })
        if (!error) created++
      }

      // 2. Sponsor registrations
      const { data: allSponsors } = await supabase.from('sponsor_registrations').select('id, amount_due, events(payment_deadline)')
      const { data: existingSponsorInvs } = await supabase.from('invoices').select('sponsor_registration_id').not('sponsor_registration_id', 'is', null)
      const existingSponsorIds = new Set((existingSponsorInvs || []).map(i => i.sponsor_registration_id))
      const missingSponsors = (allSponsors || []).filter(s => !existingSponsorIds.has(s.id))
      for (const sr of missingSponsors) {
        const { error } = await supabase.from('invoices').insert({
          sponsor_registration_id: sr.id,
          amount_due: sr.amount_due,
          status: 'unpaid',
          due_date: sr.events?.payment_deadline || null,
        })
        if (!error) created++
      }

      if (created === 0) toast.success('All registrations already have invoices!')
      else toast.success(`Generated ${created} invoice${created !== 1 ? 's' : ''}!`)
      loadInvoices()
    } catch (err) {
      toast.error(err.message || 'Failed to generate invoices')
    } finally { setGenerating(false) }
  }

  const markComplimentary = async () => {
    if (!window.confirm('Mark all R0 invoices as Complimentary (free 4-ball entries included with sponsorship)?')) return
    setFixingZero(true)
    try {
      const { data: zeroInvs } = await supabase.from('invoices').select('id').eq('amount_due', 0).eq('status', 'unpaid')
      let fixed = 0
      for (const inv of zeroInvs || []) {
        const { error } = await supabase.from('invoices').update({ status: 'complimentary' }).eq('id', inv.id)
        if (!error) fixed++
      }
      toast.success(`Marked ${fixed} invoice${fixed !== 1 ? 's' : ''} as complimentary!`)
      loadInvoices()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally { setFixingZero(false) }
  }

  const markPaid = async (inv) => {
    if (!window.confirm(`Mark ${inv.invoice_number} as paid?`)) return
    const { error } = await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', inv.id)
    if (error) return toast.error('Failed to update')
    toast.success('Marked as paid')
    loadInvoices()
  }

  const sendReminder = async (inv) => {
    if (!window.confirm(`Send reminder to ${getEmail(inv)}?`)) return
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

  const saveEditAmount = async () => {
    if (Number(editAmount.amount_due) < 0) return toast.error('Enter a valid amount')
    const { error } = await supabase.from('invoices').update({ amount_due: Number(editAmount.amount_due) }).eq('id', editAmount.id)
    if (error) return toast.error(error.message)
    toast.success('Amount updated')
    setEditAmount(null)
    loadInvoices()
  }

  // Helpers to get display info regardless of reg type
  const getName = (inv) => inv.sponsor_registrations?.contact_name || inv.registrations?.contact_name || '—'
  const getCompany = (inv) => inv.sponsor_registrations?.company_name || inv.registrations?.company || null
  const getEmail = (inv) => inv.sponsor_registrations?.contact_email || inv.registrations?.contact_email || ''
  const getEvent = (inv) => inv.sponsor_registrations?.events?.title || inv.registrations?.events?.title || '—'
  const getType = (inv) => inv.sponsor_registration_id ? `🏆 ${inv.sponsor_registrations?.sponsor_packages?.name || 'Sponsor'}` : (inv.registrations?.registration_type === 'fourball' ? '⛳ 4-Ball' : '⛳ Individual')
  const isOverdue = (inv) => inv.status === 'unpaid' && inv.due_date && new Date(inv.due_date) < new Date()

  const filtered = invoices.filter(inv => {
    if (filter === 'unpaid') return inv.status === 'unpaid'
    if (filter === 'paid') return inv.status === 'paid'
    if (filter === 'overdue') return isOverdue(inv)
    if (filter === 'complimentary') return inv.status === 'complimentary'
    return true
  })

  const badgeStyle = (inv) => {
    if (inv.status === 'paid') return 'badge-confirmed'
    if (inv.status === 'complimentary') return 'badge-info'
    if (isOverdue(inv)) return 'badge-cancelled'
    return 'badge-pending'
  }
  const badgeLabel = (inv) => {
    if (inv.status === 'paid') return 'Paid'
    if (inv.status === 'complimentary') return 'Complimentary'
    if (isOverdue(inv)) return 'Overdue'
    return 'Unpaid'
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1>Invoices</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={markComplimentary} disabled={fixingZero}>
              {fixingZero ? 'Marking...' : '🎁 Mark R0 as Complimentary'}
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
          {[{ key: 'all', label: 'All' }, { key: 'unpaid', label: 'Unpaid' }, { key: 'overdue', label: 'Overdue' }, { key: 'paid', label: 'Paid' }, { key: 'complimentary', label: 'Complimentary' }].map(t => (
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
                    <th>Invoice #</th><th>Name</th><th>Type</th><th>Event</th><th>Amount</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const overdue = isOverdue(inv)
                    return (
                      <tr key={inv.id} style={{ opacity: inv.status === 'complimentary' ? 0.6 : 1 }}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.82rem' }}>{inv.invoice_number}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{getName(inv)}</div>
                          {getCompany(inv) && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getCompany(inv)}</div>}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{getType(inv)}</td>
                        <td className="text-muted" style={{ fontSize: '0.82rem' }}>{getEvent(inv)}</td>
                        <td style={{ fontWeight: 700 }}>
                          {inv.status === 'complimentary' ? <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Free</span> : `R${Number(inv.amount_due).toLocaleString()}`}
                        </td>
                        <td>
                          <span className={`badge ${badgeStyle(inv)}`}>{badgeLabel(inv)}</span>
                        </td>
                        <td>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            {inv.status !== 'complimentary' && (
                              <Link to={`/admin/invoices/${inv.id}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>View</Link>
                            )}
                            {inv.status !== 'complimentary' && (
                              <button className="btn btn-outline btn-sm" onClick={() => setEditAmount({ id: inv.id, invoice_number: inv.invoice_number, amount_due: inv.amount_due })}>✏️</button>
                            )}
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
                const overdue = isOverdue(inv)
                return (
                  <div key={inv.id} className="card" style={{ padding: 16, opacity: inv.status === 'complimentary' ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--purple)' }}>{inv.invoice_number}</div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>{getName(inv)}</div>
                        {getCompany(inv) && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getCompany(inv)}</div>}
                      </div>
                      <span className={`badge ${badgeStyle(inv)}`}>{badgeLabel(inv)}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{getType(inv)} · {getEvent(inv)}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)', marginBottom: 12 }}>
                      {inv.status === 'complimentary' ? 'Free' : `R${Number(inv.amount_due).toLocaleString()}`}
                    </div>
                    {inv.status !== 'complimentary' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link to={`/admin/invoices/${inv.id}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>View</Link>
                        {inv.status === 'unpaid' && (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => sendReminder(inv)} disabled={sending[inv.id]} style={{ flex: 1 }}>{sending[inv.id] ? 'Sending...' : '📧 Remind'}</button>
                            <button className="btn btn-primary btn-sm" onClick={() => markPaid(inv)} style={{ flex: 1 }}>Mark Paid</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

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
              <input className="form-input" type="number" value={editAmount.amount_due} onChange={e => setEditAmount(a => ({ ...a, amount_due: e.target.value }))} autoFocus />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveEditAmount}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
