import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function MyRegistration() {
  const [email, setEmail] = useState('')
  const [registrations, setRegistrations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const handleLookup = async () => {
    if (!email.trim()) return toast.error('Please enter your email address')
    setLoading(true)
    setRegistrations(null)

    const { data, error } = await supabase
      .from('registrations')
      .select('*, events(title, event_date, event_time, venue, venue_address, slug), players(*)')
      .eq('contact_email', email.trim().toLowerCase())
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) return toast.error('Something went wrong. Please try again.')
    setRegistrations(data || [])
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

        {/* Lookup Card */}
        <div style={{
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 32,
          boxShadow: 'var(--shadow)', marginBottom: 32,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
            <h1 style={{ marginBottom: 6 }}>My Registrations</h1>
            <p className="text-muted">Enter your email address to view your event registrations</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleLookup} disabled={loading}>
              {loading ? 'Looking up...' : 'Look Up'}
            </button>
          </div>
        </div>

        {/* Results */}
        {registrations !== null && (
          registrations.length === 0 ? (
            <div style={{
              background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              padding: 48, textAlign: 'center', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.4 }}>📭</div>
              <h3 style={{ marginBottom: 6 }}>No Registrations Found</h3>
              <p className="text-muted" style={{ marginBottom: 20 }}>
                We couldn't find any registrations for <strong>{email}</strong>
              </p>
              <Link to="/" className="btn btn-outline">Browse Events →</Link>
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
                    <div key={reg.id} style={{
                      background: '#fff', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s',
                    }}>
                      {/* Header */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                        style={{ padding: '20px 24px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ marginBottom: 4 }}>{reg.events?.title || 'Event'}</h3>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {reg.events?.event_date && <span>📅 {format(new Date(reg.events.event_date), 'EEE, d MMM yyyy')}</span>}
                              {reg.events?.venue && <span>📍 {reg.events.venue}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                              background: sc.bg, color: sc.color,
                            }}>{sc.icon} {sc.label}</span>
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                          </div>
                        </div>

                        {/* Summary row */}
                        <div style={{
                          display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap',
                          fontSize: '0.82rem', color: 'var(--text-secondary)',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{reg.registration_type === 'fourball' ? '4-Ball' : 'Individual'}</span>
                            {reg.team_name && <span>· {reg.team_name}</span>}
                          </span>
                          <span>{reg.players?.length || 0} player{(reg.players?.length || 0) !== 1 ? 's' : ''}</span>
                          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '0.95rem' }}>R{Number(reg.amount_due).toLocaleString()}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 600,
                            background: pc.bg, color: pc.color,
                          }}>{pc.label}</span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg)' }}>
                          {/* Reference */}
                          <div style={{
                            display: 'inline-block', padding: '6px 14px', borderRadius: 'var(--radius)',
                            background: 'var(--purple-glow)', border: '1px solid rgba(74,32,128,0.1)',
                            fontSize: '0.8rem', marginBottom: 16,
                          }}>
                            <span className="text-muted">Ref:</span>{' '}
                            <span style={{ fontWeight: 700, color: 'var(--purple)', letterSpacing: 0.5 }}>{reg.id.substring(0, 8).toUpperCase()}</span>
                          </div>

                          {/* Players */}
                          {reg.players && reg.players.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Players</div>
                              <div style={{ display: 'grid', gap: 6 }}>
                                {reg.players.sort((a, b) => a.player_number - b.player_number).map(p => (
                                  <div key={p.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border)', fontSize: '0.85rem',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{
                                        width: 26, height: 26, borderRadius: '50%',
                                        background: 'var(--purple-glow)', border: '1px solid rgba(74,32,128,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 700, color: 'var(--purple)',
                                      }}>{p.player_number}</span>
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

                          {/* Payment info */}
                          {reg.payment_status === 'pending' && (
                            <div style={{
                              padding: 16, borderRadius: 'var(--radius)',
                              background: '#fef9c3', border: '1px solid #fde68a',
                              fontSize: '0.85rem', color: '#92400e',
                            }}>
                              <strong>Payment pending.</strong> Please make your EFT payment and upload proof of payment on the event registration page.
                              {reg.events?.slug && (
                                <div style={{ marginTop: 8 }}>
                                  <Link to={`/event/${reg.events.slug}`} style={{ color: '#92400e', fontWeight: 600 }}>
                                    View event details & banking info →
                                  </Link>
                                </div>
                              )}
                            </div>
                          )}
                          {reg.payment_status === 'uploaded' && (
                            <div style={{
                              padding: 16, borderRadius: 'var(--radius)',
                              background: '#dbeafe', border: '1px solid #93c5fd',
                              fontSize: '0.85rem', color: '#1e40af',
                            }}>
                              <strong>Proof of payment uploaded.</strong> We're reviewing your payment and will confirm your registration shortly.
                            </div>
                          )}
                          {reg.payment_status === 'rejected' && (
                            <div style={{
                              padding: 16, borderRadius: 'var(--radius)',
                              background: '#fee2e2', border: '1px solid #fca5a5',
                              fontSize: '0.85rem', color: '#991b1b',
                            }}>
                              <strong>Payment was not accepted.</strong> Please contact us or re-upload a valid proof of payment.
                            </div>
                          )}

                          {/* Contact details */}
                          <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
