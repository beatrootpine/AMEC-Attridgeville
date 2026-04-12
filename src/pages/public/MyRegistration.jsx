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
    setRegistrations(data || [])
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
