import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authClient as supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function AdminInvoiceView() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [marking, setMarking] = useState(false)

  useEffect(() => { loadInvoice() }, [id])

  const loadInvoice = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        registrations (
          contact_name, contact_email, contact_phone, company,
          registration_type, team_name, amount_due, status,
          events ( title, event_date, slug, banking_name, banking_bank, banking_account_no, banking_branch_code, banking_reference_note )
        )
      `)
      .eq('id', id)
      .single()

    if (error) toast.error('Failed to load invoice')
    setInvoice(data)
    setLoading(false)
  }

  const markPaid = async () => {
    if (!window.confirm('Mark this invoice as paid?')) return
    setMarking(true)
    await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    toast.success('Marked as paid')
    loadInvoice()
    setMarking(false)
  }

  const sendInvoiceEmail = async () => {
    setSending(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invoice`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('Invoice emailed!')
    } catch (err) {
      toast.error(err.message || 'Failed to send')
    } finally { setSending(false) }
  }

  const sendReminder = async () => {
    if (!window.confirm(`Send payment reminder to ${invoice.registrations?.contact_email}?`)) return
    setSending(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-reminder`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('Reminder sent!')
      loadInvoice()
    } catch (err) {
      toast.error(err.message || 'Failed to send')
    } finally { setSending(false) }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!invoice) return <div className="page container"><p>Invoice not found.</p></div>

  const reg = invoice.registrations
  const event = reg?.events
  const isOverdue = invoice.status === 'unpaid' && invoice.due_date && new Date(invoice.due_date) < new Date()
  const paymentRef = reg?.registration_type === 'fourball' ? (reg?.team_name || reg?.contact_name) : reg?.contact_name

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { padding: 0 !important; background: #fff !important; }
          .invoice-paper { box-shadow: none !important; border: none !important; max-width: 100% !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="page">
        <div className="container" style={{ maxWidth: 720 }}>
          {/* Action bar */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <Link to="/admin/invoices" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>← All Invoices</Link>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ Print / PDF</button>
              <button className="btn btn-outline btn-sm" onClick={sendInvoiceEmail} disabled={sending}>
                {sending ? 'Sending...' : '📧 Email Invoice'}
              </button>
              {invoice.status === 'unpaid' && (
                <>
                  <button className="btn btn-outline btn-sm" onClick={sendReminder} disabled={sending}>
                    {sending ? 'Sending...' : '🔔 Send Reminder'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={markPaid} disabled={marking}>
                    {marking ? 'Saving...' : '✓ Mark as Paid'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Invoice paper */}
          <div className="invoice-paper card" style={{ padding: '40px 48px', maxWidth: 680, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div>
                <img src="/logo.png" alt="AMEC" style={{ height: 52, marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>AME Church, Ebenezer Temple</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Atteridgeville, Pretoria West</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Non-Profit Organisation</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--purple)', letterSpacing: -1 }}>INVOICE</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{invoice.invoice_number}</div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${invoice.status === 'paid' ? 'badge-confirmed' : isOverdue ? 'badge-cancelled' : 'badge-pending'}`} style={{ fontSize: '0.75rem' }}>
                    {invoice.status === 'paid' ? '✓ Paid' : isOverdue ? 'Overdue' : 'Unpaid'}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
              <div style={{ fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Bill To</div>
                <div style={{ fontWeight: 700 }}>{reg?.contact_name}</div>
                {reg?.company && <div>{reg.company}</div>}
                <div style={{ color: 'var(--text-muted)' }}>{reg?.contact_email}</div>
                <div style={{ color: 'var(--text-muted)' }}>{reg?.contact_phone}</div>
              </div>
              <div style={{ fontSize: '0.82rem', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Dates</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Invoice Date: </span>{format(new Date(invoice.created_at), 'd MMMM yyyy')}</div>
                {invoice.due_date && <div style={{ color: isOverdue ? 'var(--red)' : undefined }}><span style={{ color: 'var(--text-muted)' }}>Due Date: </span>{format(new Date(invoice.due_date), 'd MMMM yyyy')}</div>}
                {invoice.status === 'paid' && invoice.paid_at && <div style={{ color: 'var(--green)' }}><span>Paid: </span>{format(new Date(invoice.paid_at), 'd MMMM yyyy')}</div>}
              </div>
            </div>

            {/* Line items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
              <thead>
                <tr style={{ background: 'var(--purple)', color: '#fff' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px', fontSize: '0.88rem' }}>
                    <div style={{ fontWeight: 600 }}>
                      {reg?.registration_type === 'fourball' ? `4-Ball Entry — ${reg?.team_name || 'Team'}` : 'Individual Entry'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{event?.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {event?.event_date && format(new Date(event.event_date), 'd MMMM yyyy')} · Centurion Golf Course
                    </div>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, fontSize: '0.95rem' }}>
                    R{Number(invoice.amount_due).toLocaleString()}
                  </td>
                </tr>
                <tr style={{ background: 'rgba(74,32,128,0.04)' }}>
                  <td style={{ padding: '14px', fontWeight: 700 }}>Total Due</td>
                  <td style={{ padding: '14px', textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', color: 'var(--purple)' }}>
                    R{Number(invoice.amount_due).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Banking details */}
            {event?.banking_name && (
              <div style={{ marginTop: 28, padding: '16px 20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>EFT Banking Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Account Name:</span> {event.banking_name}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Bank:</span> {event.banking_bank}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Account No:</span> {event.banking_account_no}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Branch Code:</span> {event.banking_branch_code}</div>
                </div>
                <div style={{ marginTop: 12, padding: '8px 14px', background: 'var(--purple)', color: '#fff', borderRadius: 6, display: 'inline-block', fontWeight: 700 }}>
                  Reference: {paymentRef}
                </div>
              </div>
            )}

            {/* Reminder history */}
            {invoice.reminder_count > 0 && (
              <div style={{ marginTop: 20, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {invoice.reminder_count} reminder{invoice.reminder_count > 1 ? 's' : ''} sent
                {invoice.last_reminder_at && ` · Last sent ${format(new Date(invoice.last_reminder_at), 'd MMM yyyy')}`}
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              AME Church Ebenezer Temple · Atteridgeville Township, Pretoria West<br />
              Fundraising Golf Day — Church Building Project &amp; Community Initiatives
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
