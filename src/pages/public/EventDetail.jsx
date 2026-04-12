import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { generateICS } from '../../lib/calendar'

export default function EventDetail() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasSponsors, setHasSponsors] = useState(false)

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', slug).single()
      .then(async ({ data }) => {
        setEvent(data)
        if (data) {
          const { count } = await supabase.from('sponsor_packages').select('id', { count: 'exact', head: true }).eq('event_id', data.id)
          setHasSponsors(count > 0)
        }
        setLoading(false)
      })
  }, [slug])

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!event) return <div className="page container"><div className="empty-state"><p>Event not found.</p></div></div>

  const isClosedByDate = event.registration_close_date && new Date(event.registration_close_date + 'T23:59:59') < new Date()
  const isClosed = !event.registration_open || isClosedByDate

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        {event.banner_url && (
          <img src={event.banner_url} alt="" style={{ width: '100%', height: 'auto', maxHeight: 600, objectFit: 'contain', background: '#f0ede6', borderRadius: 'var(--radius-lg)', marginBottom: 32 }} />
        )}

        <h1 style={{ marginBottom: 8 }}>{event.title}</h1>
        <div className="flex gap-3 flex-wrap mb-4" style={{ marginTop: 12 }}>
          <span className="text-muted">📅 {format(new Date(event.event_date), 'EEEE, d MMMM yyyy')}</span>
          {event.event_time && <span className="text-muted">🕐 {event.event_time.substring(0, 5)}</span>}
          {event.venue && <span className="text-muted">📍 {event.venue}</span>}
          <button onClick={() => generateICS(event)} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>
            📅 Add to Calendar
          </button>
        </div>

        {event.payment_deadline && (
          <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', marginBottom: 20, background: 'rgba(202,138,4,0.08)', border: '1px solid rgba(202,138,4,0.15)', fontSize: '0.85rem', color: '#92400e' }}>
            💰 Payment deadline: <strong>{format(new Date(event.payment_deadline), 'd MMMM yyyy')}</strong>
          </div>
        )}

        {event.registration_close_date && !isClosedByDate && (
          <div style={{
            padding: '10px 16px', borderRadius: 'var(--radius)', marginBottom: 20,
            background: 'var(--yellow-dim)', border: '1px solid rgba(202,138,4,0.15)',
            fontSize: '0.85rem', color: 'var(--yellow)',
          }}>
            ⏰ Registration closes <strong>{format(new Date(event.registration_close_date), 'd MMMM yyyy')}</strong>
          </div>
        )}

        {event.description && (
          <div className="card mb-4" style={{ lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
            {event.description}
          </div>
        )}

        <div className="card mb-4">
          <h3 style={{ marginBottom: 16 }}>Registration Options</h3>
          <div className="grid-2">
            {(event.registration_type === 'individual' || event.registration_type === 'both') && (
              <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center', background: 'var(--bg)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏌️</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{event.individual_label || 'Individual'}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 700 }}>R{event.individual_price}</div>
              </div>
            )}
            {(event.registration_type === 'fourball' || event.registration_type === 'both') && (
              <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center', background: 'var(--bg)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>👥</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{event.fourball_label || '4-Ball'}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 700 }}>R{event.fourball_price}</div>
              </div>
            )}
          </div>
        </div>

        {event.banking_name && (
          <div className="card mb-4" style={{ background: 'var(--gold-glow)' }}>
            <h3 style={{ marginBottom: 12 }}>Banking Details</h3>
            <div style={{ display: 'grid', gap: 8, fontSize: '0.9rem' }}>
              <div><span className="text-muted">Account Name:</span> {event.banking_name}</div>
              <div><span className="text-muted">Bank:</span> {event.banking_bank}</div>
              <div><span className="text-muted">Account No:</span> {event.banking_account_no}</div>
              <div><span className="text-muted">Branch Code:</span> {event.banking_branch_code}</div>
              {event.banking_reference_note && <div className="text-muted" style={{ marginTop: 4, fontStyle: 'italic' }}>{event.banking_reference_note}</div>}
            </div>
          </div>
        )}

        {isClosed ? (
          <div className="card text-center" style={{ color: 'var(--text-muted)', padding: 32 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🚫</div>
            {isClosedByDate ? 'The registration deadline for this event has passed.' : 'Registration is currently closed for this event.'}
          </div>
        ) : (
          <>
            <Link to={`/event/${slug}/register`} className="btn btn-primary btn-lg btn-full" style={{ textDecoration: 'none' }}>
              Register Now →
            </Link>
            {hasSponsors && (
              <Link to={`/event/${slug}/sponsor`} className="btn btn-gold btn-lg btn-full" style={{ textDecoration: 'none', marginTop: 10 }}>
                🏆 Become a Sponsor
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
