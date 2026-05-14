import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

export default function InvoiceDownload() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { loadInvoice() }, [id])

  const loadInvoice = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        registrations (
          contact_name, contact_email, contact_phone, company,
          registration_type, team_name, amount_due, status,
          events ( title, event_date, venue, banking_name, banking_bank, banking_account_no, banking_branch_code )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) { setNotFound(true); setLoading(false); return }
    setInvoice(data)
    setLoading(false)
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  if (notFound) return (
    <div className="page">
      <div className="container" style={{ maxWidth: 500, textAlign: 'center', paddingTop: 64 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
        <h2>Invoice Not Found</h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>This invoice link may be invalid or expired.</p>
        <Link to="/" className="btn btn-outline" style={{ textDecoration: 'none' }}>← Back to Events</Link>
      </div>
    </div>
  )

  const reg = invoice.registrations
  const event = reg?.events
  const isOverdue = invoice.status === 'unpaid' && invoice.due_date && new Date(invoice.due_date) < new Date()
  const paymentRef = reg?.registration_type === 'fourball' ? (reg?.team_name || reg?.contact_name) : reg?.contact_name

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .invoice-paper { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="page" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ maxWidth: 700 }}>

          {/* Action bar */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <Link to="/my-registration" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>← My Registrations</Link>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Download / Print PDF</button>
          </div>

          {/* Invoice */}
          <div className="invoice-paper card" style={{ padding: '40px 44px', borderRadius: 12 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div>
                <img src="/logo.png" alt="AMEC" style={{ height: 56, marginBottom: 10, display: 'block' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>AME Church, Ebenezer Temple</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Atteridgeville, Pretoria West</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Non-Profit Organisation</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--purple)', letterSpacing: -1 }}>INVOICE</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>{invoice.invoice_number}</div>
                <div style={{ marginTop: 8 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                    background: invoice.status === 'paid' ? '#dcfce7' : isOverdue ? '#fee2e2' : '#fef9c3',
                    color: invoice.status === 'paid' ? '#15803d' : isOverdue ? '#dc2626' : '#a16207',
                  }}>
                    {invoice.status === 'paid' ? '✓ PAID' : isOverdue ? 'OVERDUE' : 'UNPAID'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill to / dates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
              <div style={{ fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Bill To</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{reg?.contact_name}</div>
                {reg?.company && <div>{reg.company}</div>}
                <div style={{ color: 'var(--text-muted)' }}>{reg?.contact_email}</div>
                {reg?.contact_phone && <div style={{ color: 'var(--text-muted)' }}>{reg.contact_phone}</div>}
              </div>
              <div style={{ fontSize: '0.82rem', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Invoice Details</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Date: </span>{format(new Date(invoice.created_at), 'd MMMM yyyy')}</div>
                {invoice.due_date && (
                  <div style={{ color: isOverdue ? '#dc2626' : undefined }}>
                    <span style={{ color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>Due: </span>
                    {format(new Date(invoice.due_date), 'd MMMM yyyy')}
                  </div>
                )}
                {invoice.paid_at && (
                  <div style={{ color: '#15803d' }}><span>Paid: </span>{format(new Date(invoice.paid_at), 'd MMMM yyyy')}</div>
                )}
              </div>
            </div>

            {/* Line items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
              <thead>
                <tr style={{ background: 'var(--purple)', color: '#fff' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {reg?.registration_type === 'fourball'
                        ? `4-Ball Entry — ${reg?.team_name || 'Team'}`
                        : 'Individual Entry'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{event?.title}</div>
                    {event?.event_date && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {format(new Date(event.event_date), 'd MMMM yyyy')} · {event.venue || 'Centurion Golf Course'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600 }}>
                    R{Number(invoice.amount_due).toLocaleString()}
                  </td>
                </tr>
                <tr style={{ background: 'rgba(89,26,74,0.04)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>Total Due</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, fontSize: '1.3rem', color: 'var(--purple)' }}>
                    R{Number(invoice.amount_due).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Banking details — only show if unpaid */}
            {invoice.status !== 'paid' && event?.banking_name && (
              <div style={{ marginTop: 28, padding: '18px 20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>
                  EFT Banking Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Account Name: </span><strong>{event.banking_name}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Bank: </span><strong>{event.banking_bank}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Account No: </span><strong>{event.banking_account_no}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Branch Code: </span><strong>{event.banking_branch_code}</strong></div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>USE THIS AS YOUR PAYMENT REFERENCE:</div>
                  <div style={{ display: 'inline-block', padding: '8px 16px', background: 'var(--purple)', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: '0.95rem', letterSpacing: 0.3 }}>
                    {paymentRef}
                  </div>
                </div>
              </div>
            )}

            {/* Upload prompt if unpaid */}
            {invoice.status !== 'paid' && (
              <div className="no-print" style={{ marginTop: 20, padding: '14px 16px', background: '#fef9c3', borderRadius: 8, fontSize: '0.82rem', color: '#713f12' }}>
                Once you've made payment, go to <strong>My Registrations</strong> to upload your proof of payment.
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8 }}>
              AME Church Ebenezer Temple · Atteridgeville Township, Pretoria West<br />
              Fundraising Golf Day — Church Building Project &amp; Community Initiatives<br />
              <span style={{ fontFamily: 'monospace' }}>{invoice.invoice_number}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
