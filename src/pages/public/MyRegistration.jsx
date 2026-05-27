import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { generateICS } from '../../lib/calendar'
import toast from 'react-hot-toast'

export default function MyRegistration() {
  const [email, setEmail] = useState('')
  const [registrations, setRegistrations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [uploading, setUploading] = useState(null)
  const [invoiceMap, setInvoiceMap] = useState({})

  const printInvoice = (reg, invoice) => {
    const event = reg.events
    const paymentRef = reg.registration_type === 'fourball' ? (reg.team_name || reg.contact_name) : reg.contact_name
    const isOverdue = invoice.status === 'unpaid' && invoice.due_date && new Date(invoice.due_date) < new Date()

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 40px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo-area h2 { font-size: 1rem; margin-top: 8px; }
  .logo-area p { font-size: 0.78rem; color: #666; }
  .invoice-label { font-size: 2rem; font-weight: 900; color: #591a4a; letter-spacing: -1px; }
  .invoice-num { font-family: monospace; font-weight: 700; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; margin-top: 8px;
    background: ${invoice.status === 'paid' ? '#dcfce7' : isOverdue ? '#fee2e2' : '#fef9c3'};
    color: ${invoice.status === 'paid' ? '#15803d' : isOverdue ? '#dc2626' : '#a16207'}; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 28px; }
  .meta-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.5px; color: #999; font-weight: 700; margin-bottom: 6px; }
  .meta-right { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  thead tr { background: #591a4a; color: #fff; }
  th { padding: 10px 16px; text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; }
  th:last-child { text-align: right; }
  td { padding: 16px; border-bottom: 1px solid #eee; font-size: 0.88rem; }
  td:last-child { text-align: right; font-weight: 600; }
  .total-row td { background: #f8f4ff; font-weight: 700; }
  .total-row td:last-child { font-size: 1.3rem; color: #591a4a; font-weight: 900; }
  .banking { margin-top: 28px; padding: 18px 20px; background: #f9f9f9; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.82rem; }
  .banking-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.5px; color: #999; font-weight: 700; margin-bottom: 12px; }
  .banking-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 14px; }
  .ref-box { display: inline-block; padding: 8px 16px; background: #591a4a; color: #fff; border-radius: 6px; font-weight: 700; font-size: 0.95rem; }
  .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.75rem; color: #999; text-align: center; line-height: 1.8; }
</style></head>
<body>
  <div class="header">
    <div class="logo-area">
      <h2>AME Church, Ebenezer Temple</h2>
      <p>Atteridgeville, Pretoria West</p>
      <p>Non-Profit Organisation</p>
    </div>
    <div style="text-align:right">
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-num">${invoice.invoice_number}</div>
      <div class="status-badge">${invoice.status === 'paid' ? '✓ PAID' : isOverdue ? 'OVERDUE' : 'UNPAID'}</div>
    </div>
  </div>
  <div class="meta">
    <div>
      <div class="meta-label">Bill To</div>
      <div style="font-weight:700;font-size:0.95rem">${reg.contact_name}</div>
      ${reg.company ? '<div>' + reg.company + '</div>' : ''}
      <div style="color:#666">${reg.contact_email}</div>
      ${reg.contact_phone ? '<div style="color:#666">' + reg.contact_phone + '</div>' : ''}
    </div>
    <div class="meta-right">
      <div class="meta-label">Invoice Details</div>
      <div><span style="color:#666">Date: </span>${new Date(invoice.created_at).toLocaleDateString('en-ZA', {day:'numeric',month:'long',year:'numeric'})}</div>
      ${invoice.due_date ? '<div><span style="color:#666">Due: </span>' + new Date(invoice.due_date).toLocaleDateString('en-ZA', {day:'numeric',month:'long',year:'numeric'}) + '</div>' : ''}
      ${invoice.paid_at ? '<div style="color:#15803d">Paid: ' + new Date(invoice.paid_at).toLocaleDateString('en-ZA', {day:'numeric',month:'long',year:'numeric'}) + '</div>' : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>
          <div style="font-weight:600;margin-bottom:4px">${reg.registration_type === 'fourball' ? '4-Ball Entry — ' + (reg.team_name || 'Team') : 'Individual Entry'}</div>
          <div style="color:#666;font-size:0.8rem">${event?.title || ''}</div>
          ${event?.event_date ? '<div style="color:#666;font-size:0.78rem">' + new Date(event.event_date).toLocaleDateString('en-ZA', {day:'numeric',month:'long',year:'numeric'}) + ' · ' + (event.venue || 'Centurion Golf Course') + '</div>' : ''}
        </td>
        <td>R${Number(invoice.amount_due).toLocaleString()}</td>
      </tr>
      <tr class="total-row"><td>Total Due</td><td>R${Number(invoice.amount_due).toLocaleString()}</td></tr>
    </tbody>
  </table>
  ${invoice.status !== 'paid' && event?.banking_name ? `
  <div class="banking">
    <div class="banking-label">EFT Banking Details</div>
    <div class="banking-grid">
      <div><span style="color:#666">Account Name: </span><strong>${event.banking_name}</strong></div>
      <div><span style="color:#666">Bank: </span><strong>${event.banking_bank}</strong></div>
      <div><span style="color:#666">Account No: </span><strong>${event.banking_account_no}</strong></div>
      <div><span style="color:#666">Branch Code: </span><strong>${event.banking_branch_code}</strong></div>
    </div>
    <div style="font-size:0.72rem;color:#999;margin-bottom:8px">USE THIS AS YOUR PAYMENT REFERENCE:</div>
    <div class="ref-box">${paymentRef}</div>
  </div>` : ''}
  <div class="footer">
    AME Church Ebenezer Temple · Atteridgeville Township, Pretoria West<br/>
    Fundraising Golf Day — Church Building Project &amp; Community Initiatives<br/>
    ${invoice.invoice_number}
  </div>
</body></html>`

    const w = window.open('', '_blank', 'width=800,height=900')
    w.document.write(html)
    w.document.close()
    w.onload = () => { w.focus(); w.print() }
  }

  const handleLookup = async () => {
    if (!email.trim()) return toast.error('Please enter your email address')
    setLoading(true)
    setRegistrations(null)

    const { data, error } = await supabase
      .from('registrations')
      .select('*, events(title, event_date, event_time, venue, venue_address, slug, banking_name, banking_bank, banking_account_no, banking_branch_code, banking_reference_note, payment_deadline, post_registration_info), players(*)')
      .eq('contact_email', email.trim().toLowerCase())
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) return toast.error('Something went wrong. Please try again.')
    const regs = data || []
    setRegistrations(regs)

    // Fetch invoices for all registrations
    if (regs.length > 0) {
      const regIds = regs.map(r => r.id)
      const { data: invData } = await supabase.from('invoices').select('*').in('registration_id', regIds)
      const map = {}
      ;(invData || []).forEach(inv => {
        map[inv.registration_id] = inv.id
        map[inv.registration_id + '_data'] = inv
      })
      setInvoiceMap(map)
    }
  }

  const handleUploadPOP = async (reg) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) return toast.error('File too large. Max 5MB.')

      setUploading(reg.id)
      try {
        const ext = file.name.split('.').pop()
        const path = `${reg.event_id}/${reg.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, file)
        if (upErr) throw upErr

        const { error: updateErr } = await supabase.from('registrations').update({
          payment_proof_url: path,
          payment_status: 'uploaded',
        }).eq('id', reg.id)
        if (updateErr) throw updateErr

        toast.success('Proof of payment uploaded!')
        handleLookup() // Refresh
      } catch (err) {
        toast.error(err.message || 'Upload failed')
      } finally { setUploading(null) }
    }
    input.click()
  }

  const statusConfig = {
    pending: { bg: '#fef9c3', color: '#a16207', label: 'Pending', icon: '⏳' },
    confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed', icon: '✅' },
    cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled', icon: '❌' },
  }

  const paymentConfig = {
    pending: { bg: '#fef9c3', color: '#a16207', label: 'Awaiting Payment' },
    uploaded: { bg: '#dbeafe', color: '#2563eb', label: 'Proof Uploaded' },
    verified: { bg: '#dcfce7', color: '#15803d', label: 'Payment Verified' },
    rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Payment Rejected' },
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>

        {/* Lookup */}
        <div style={{
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 32,
          boxShadow: 'var(--shadow)', marginBottom: 32,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
            <h1 style={{ marginBottom: 6 }}>My Registrations</h1>
            <p className="text-muted">Enter your email address to view your registrations and upload proof of payment</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" onKeyDown={e => e.key === 'Enter' && handleLookup()} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleLookup} disabled={loading}>
              {loading ? 'Looking up...' : 'Look Up'}
            </button>
          </div>
        </div>

        {/* Results */}
        {registrations !== null && (
          registrations.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.4 }}>📭</div>
              <h3 style={{ marginBottom: 6 }}>No Registrations Found</h3>
              <p className="text-muted" style={{ marginBottom: 20 }}>We couldn't find any registrations for <strong>{email}</strong></p>
              <Link to="/" className="btn btn-outline" style={{ textDecoration: 'none' }}>Browse Events →</Link>
            </div>
          ) : (
            <div>
              <p className="text-muted" style={{ marginBottom: 16 }}>
                Found <strong style={{ color: 'var(--text)' }}>{registrations.length}</strong> registration{registrations.length > 1 ? 's' : ''} for <strong style={{ color: 'var(--text)' }}>{email}</strong>
              </p>

              <div style={{ display: 'grid', gap: 16 }}>
                {registrations.map(reg => {
                  const sc = statusConfig[reg.status] || statusConfig.pending
                  const pc = paymentConfig[reg.payment_status] || paymentConfig.pending
                  const isExpanded = expandedId === reg.id

                  return (
                    <div key={reg.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                      {/* Header */}
                      <div onClick={() => setExpandedId(isExpanded ? null : reg.id)} style={{ padding: '20px 24px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ marginBottom: 4 }}>{reg.events?.title || 'Event'}</h3>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {reg.events?.event_date && <span>📅 {format(new Date(reg.events.event_date), 'EEE, d MMM yyyy')}</span>}
                              {reg.events?.venue && <span>📍 {reg.events.venue}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.icon} {sc.label}</span>
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{reg.registration_type === 'fourball' ? '4-Ball' : 'Individual'}{reg.team_name ? ` · ${reg.team_name}` : ''}</span>
                          <span>{reg.players?.length || 0} player{(reg.players?.length || 0) !== 1 ? 's' : ''}</span>
                          <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.95rem' }}>R{Number(reg.amount_due).toLocaleString()}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 600, background: pc.bg, color: pc.color }}>{pc.label}</span>
                        </div>
                      </div>

                      {/* Expanded */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg)' }}>
                          {/* Ref */}
                          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 'var(--radius)', background: 'rgba(89,26,74,0.04)', border: '1px solid rgba(89,26,74,0.1)', fontSize: '0.8rem', marginBottom: 16 }}>
                            <span className="text-muted">Ref:</span> <span style={{ fontWeight: 700, color: 'var(--purple)' }}>{reg.id.substring(0, 8).toUpperCase()}</span>
                          </div>

                          {/* Players */}
                          {reg.players && reg.players.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Players</div>
                              <div style={{ display: 'grid', gap: 6 }}>
                                {reg.players.sort((a, b) => a.player_number - b.player_number).map(p => (
                                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(89,26,74,0.04)', border: '1px solid rgba(89,26,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--purple)' }}>{p.player_number}</span>
                                      <span style={{ fontWeight: 500 }}>{p.full_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                      {p.handicap && <span>HC: {p.handicap}</span>}
                                      {p.shirt_size && <span>Shirt: {p.shirt_size}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Payment Action Area */}
                          {reg.payment_status === 'pending' && (
                            <div style={{ padding: 20, borderRadius: 'var(--radius)', background: '#fff', border: '1px solid var(--border)', marginBottom: 16 }}>
                              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>💳 Upload Proof of Payment</div>

                              {reg.events?.payment_deadline && (
                                <div style={{ padding: '8px 12px', background: 'rgba(202,138,4,0.08)', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: '0.82rem', color: '#92400e' }}>
                                  ⏰ Payment deadline: <strong>{new Date(reg.events.payment_deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                                </div>
                              )}

                              {reg.events?.banking_name && (
                                <div style={{ marginBottom: 14, padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: '0.82rem' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Banking Details</div>
                                  <div><span className="text-muted">Account:</span> {reg.events.banking_name}</div>
                                  <div><span className="text-muted">Bank:</span> {reg.events.banking_bank}</div>
                                  <div><span className="text-muted">Acc No:</span> {reg.events.banking_account_no}</div>
                                  <div><span className="text-muted">Branch:</span> {reg.events.banking_branch_code}</div>
                                  {reg.events.banking_reference_note && <div style={{ marginTop: 6, color: 'var(--gold)', fontStyle: 'italic', fontSize: '0.78rem' }}>{reg.events.banking_reference_note}</div>}
                                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(89,26,74,0.04)', borderRadius: 'var(--radius)', fontSize: '0.8rem' }}>
                                    <strong>Your reference:</strong> <span style={{ color: 'var(--purple)' }}>{reg.registration_type === 'fourball' ? reg.team_name || reg.contact_name : reg.contact_name}</span>
                                  </div>
                                </div>
                              )}

                              <button
                                className="btn btn-primary btn-full"
                                onClick={() => handleUploadPOP(reg)}
                                disabled={uploading === reg.id}
                              >
                                {uploading === reg.id ? 'Uploading...' : '📎 Upload Proof of Payment'}
                              </button>
                            </div>
                          )}

                          {reg.payment_status === 'uploaded' && (
                            <div style={{ padding: 16, borderRadius: 'var(--radius)', background: '#dbeafe', border: '1px solid #93c5fd', fontSize: '0.85rem', color: '#1e40af', marginBottom: 16 }}>
                              <strong>Proof of payment uploaded.</strong> We're reviewing your payment and will confirm shortly.
                            </div>
                          )}

                          {reg.payment_status === 'rejected' && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ padding: 16, borderRadius: 'var(--radius)', background: '#fee2e2', border: '1px solid #fca5a5', fontSize: '0.85rem', color: '#991b1b', marginBottom: 10 }}>
                                <strong>Payment was not accepted.</strong> Please re-upload a valid proof of payment.
                              </div>
                              <button
                                className="btn btn-primary btn-full"
                                onClick={() => handleUploadPOP(reg)}
                                disabled={uploading === reg.id}
                              >
                                {uploading === reg.id ? 'Uploading...' : '📎 Re-upload Proof of Payment'}
                              </button>
                            </div>
                          )}

                          {reg.payment_status === 'verified' && (
                            <div style={{ padding: 16, borderRadius: 'var(--radius)', background: '#dcfce7', border: '1px solid #86efac', fontSize: '0.85rem', color: '#15803d', marginBottom: 16 }}>
                              ✅ <strong>Payment verified.</strong> Your registration is confirmed!
                            </div>
                          )}

                          {/* Important Info */}
                          {reg.events?.post_registration_info && (
                            <div style={{ padding: 16, borderRadius: 'var(--radius)', background: '#fff', border: '1px solid var(--border)', marginBottom: 16 }}>
                              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.88rem' }}>📋 Important Information</div>
                              <div style={{ whiteSpace: 'pre-line', fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                {reg.events.post_registration_info}
                              </div>
                            </div>
                          )}

                          {/* Add to Calendar */}
                          {reg.events && reg.status !== 'cancelled' && (
                            <button onClick={() => generateICS(reg.events)} className="btn btn-outline btn-sm" style={{ marginBottom: 12 }}>
                              📅 Add to Calendar
                            </button>
                          )}

                          {/* Invoice download */}
                          {invoiceMap[reg.id] && invoiceMap[reg.id + '_data'] && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ marginBottom: 12, marginLeft: 8 }}
                              onClick={() => printInvoice(reg, invoiceMap[reg.id + '_data'])}
                            >
                              🧾 Download Invoice
                            </button>
                          )}

                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Registered on {format(new Date(reg.created_at), 'd MMM yyyy, HH:mm')}
                            {reg.company && <span> · {reg.company}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
