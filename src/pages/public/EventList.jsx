import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

export default function EventList() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('registration_open', true)
      .order('event_date', { ascending: true })
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <div className="text-center mb-4" style={{ marginBottom: 48 }}>
          <h1 style={{ marginBottom: 8 }}>Upcoming <span className="text-gold">Events</span></h1>
          <p className="text-muted">Register for our upcoming events below</p>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No upcoming events right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid-2">
            {events.map(ev => (
              <Link key={ev.id} to={`/event/${ev.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card card-hover" style={{ height: '100%' }}>
                  {ev.banner_url && (
                    <img src={ev.banner_url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: 16 }} />
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ background: 'var(--gold-glow)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center', minWidth: 56 }}>
                      <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>
                        {format(new Date(ev.event_date), 'd')}
                      </div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
                        {format(new Date(ev.event_date), 'MMM yyyy')}
                      </div>
                    </div>
                    <div>
                      <h3 style={{ marginBottom: 4 }}>{ev.title}</h3>
                      <p className="text-muted" style={{ fontSize: '0.8rem' }}>📍 {ev.venue || 'TBA'}</p>
                    </div>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {ev.description?.substring(0, 120)}{ev.description?.length > 120 ? '...' : ''}
                  </p>
                  <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {(ev.registration_type === 'individual' || ev.registration_type === 'both') && (
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>🏌️ Individual — R{ev.individual_price}</span>
                    )}
                    {(ev.registration_type === 'fourball' || ev.registration_type === 'both') && (
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>👥 4-Ball — R{ev.fourball_price}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
