import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

export default function EventDetail() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', slug).single()
      .then(({ data }) => { setEvent(data); setLoading(false) })
  }, [slug])

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!event) return <div className="page container"><div className="empty-state"><p>Event not found.</p></div></div>

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        {event.banner_url && (
          <img src={event.banner_url} alt="" style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginBottom: 32 }} />
        )}

        <h1 style={{ marginBottom: 8 }}>{event.title}</h1>
        <div className="flex gap-3 flex-wrap mb-4" style={{ marginTop: 12 }}>
          <span className="text-muted">📅 {format(new Date(event.event_date), 'EEEE, d MMMM yyyy')}</span>
          {event.event_time && <span className="text-muted">🕐 {event.event_time}</span>}
          {event.venue && <span className="text-muted">📍 {event.venue}</span>}
        </div>

        {event.description && (
          <div className="card mb-4" style={{ lineHeight: 1.8, color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
            {event.description}
          </div>
        )}

        <div className="card mb-4">
          <h3 style={{ marginBottom: 16 }}>Registration Options</h3>
          <div className="grid-2">
            {(event.registration_type === 'individual' || event.registration_type === 'both') && (
              <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏌️</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Individual</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)' }}>R{event.individual_price}</div>
              </div>
            )}
            {(event.registration_type === 'fourball' || event.registration_type === 'both') && (
              <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>👥</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>4-Ball</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)' }}>R{event.fourball_price}</div>
              </div>
            )}
          </div>
        </div>

        {event.banking_name && (
          <div className="card mb-4" style={{ background: 'rgba(201,168,76,0.04)' }}>
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

        {event.registration_open ? (
          <Link to={`/event/${slug}/register`} className="btn btn-primary btn-lg btn-full" style={{ textDecoration: 'none' }}>
            Register Now →
          </Link>
        ) : (
          <div className="card text-center" style={{ color: 'var(--text-muted)' }}>
            Registration is currently closed for this event.
          </div>
        )}
      </div>
    </div>
  )
}
