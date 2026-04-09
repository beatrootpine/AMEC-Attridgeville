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

  return (
    <>
      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #3b1a6e 0%, #4a2080 30%, #2d1560 100%)',
        padding: '64px 20px 56px', textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <img src="/logo.png" alt="AMEC" style={{ height: 80, marginBottom: 16, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.3))' }} />
          <div style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.65)', marginBottom: 10,
          }}>
            African Methodist Episcopal Church
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
            color: '#fff', marginBottom: 6, lineHeight: 1.2,
          }}>
            Ebenezer Temple
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginBottom: 24 }}>
            Atteridgeville, Pretoria West
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#events" style={{
              padding: '11px 28px', borderRadius: 'var(--radius)',
              background: 'var(--gold)', color: '#fff', fontWeight: 600,
              fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s',
            }}>View Events ↓</a>
            <Link to="/my-registration" style={{
              padding: '11px 28px', borderRadius: 'var(--radius)',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
            }}>My Registration</Link>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="page" style={{ paddingTop: 32 }} id="events">
        <div className="container">
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ marginBottom: 4 }}>Upcoming <span className="text-gold">Events</span></h2>
            <p className="text-muted">Select an event to view details and register</p>
          </div>

          {loading ? (
            <div className="loading-page"><div className="spinner" /></div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p style={{ marginBottom: 8, fontWeight: 500 }}>No upcoming events</p>
              <p className="text-muted">Check back soon for new events</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {events.map(ev => (
                <Link key={ev.id} to={`/event/${ev.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card card-hover" style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'center', gap: 20, padding: '20px 24px',
                  }}>
                    {/* Date */}
                    <div style={{
                      background: 'var(--purple-glow)', border: '1px solid rgba(74,32,128,0.12)',
                      borderRadius: 'var(--radius)', padding: '14px 18px', textAlign: 'center', minWidth: 66,
                    }}>
                      <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', color: 'var(--purple)', lineHeight: 1 }}>
                        {format(new Date(ev.event_date), 'd')}
                      </div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginTop: 2 }}>
                        {format(new Date(ev.event_date), 'MMM yyyy')}
                      </div>
                    </div>

                    {/* Info */}
                    <div>
                      <h3 style={{ marginBottom: 4, fontSize: '1.1rem' }}>{ev.title}</h3>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ev.venue && <span>📍 {ev.venue}</span>}
                        {ev.event_time && <span>🕐 {ev.event_time}</span>}
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: 'right' }}>
                      {(ev.registration_type === 'individual' || ev.registration_type === 'both') && (
                        <div style={{ marginBottom: 2 }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>From</div>
                          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.15rem' }}>R{ev.individual_price}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: 60, paddingTop: 24, borderTop: '1px solid var(--border)',
            textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)',
          }}>
            <img src="/logo.png" alt="" style={{ height: 36, opacity: 0.3, marginBottom: 10 }} />
            <div>AMEC Ebenezer Temple · Atteridgeville, Pretoria West</div>
            <div style={{ marginTop: 4 }}>Powered by <span style={{ color: 'var(--text-muted)' }}>Beatroot Pineapple</span></div>
          </div>
        </div>
      </div>
    </>
  )
}
