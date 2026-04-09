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
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a3a1a 0%, #0e2a0e 40%, #0e0a18 100%)',
        padding: '80px 20px 60px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(212,168,50,0.2)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <img src="/logo.png" alt="AMEC" style={{ height: 90, marginBottom: 20, filter: 'drop-shadow(0 4px 20px rgba(212,168,50,0.3))' }} />
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: 12, fontFamily: 'var(--font-body)',
          }}>
            African Methodist Episcopal Church
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            color: '#fff', marginBottom: 8, lineHeight: 1.2,
          }}>
            Ebenezer Temple
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: 28, letterSpacing: 0.5 }}>
            Atteridgeville, Pretoria West
          </p>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 40,
            background: 'rgba(212,168,50,0.1)', border: '1px solid rgba(212,168,50,0.25)',
            color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s ease-in-out infinite' }} />
            Registration Open
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(to top, var(--bg), transparent)',
        }} />
      </div>

      {/* Events */}
      <div className="page" style={{ paddingTop: 32 }}>
        <div className="container">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 32, flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Upcoming <span className="text-gold">Events</span></h2>
              <p className="text-muted">Register below to secure your spot</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-page"><div className="spinner" /></div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p>No upcoming events right now. Check back soon!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              {events.map(ev => (
                <Link key={ev.id} to={`/event/${ev.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card card-hover" style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'center', gap: 24, padding: 24,
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(74,32,128,0.3), rgba(74,32,128,0.1))',
                      border: '1px solid rgba(74,32,128,0.3)',
                      borderRadius: 'var(--radius)', padding: '16px 20px',
                      textAlign: 'center', minWidth: 72,
                    }}>
                      <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', color: 'var(--gold)', lineHeight: 1 }}>
                        {format(new Date(ev.event_date), 'd')}
                      </div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                        {format(new Date(ev.event_date), 'MMM')}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
                        {format(new Date(ev.event_date), 'yyyy')}
                      </div>
                    </div>

                    <div>
                      <h3 style={{ marginBottom: 6, fontSize: '1.15rem' }}>{ev.title}</h3>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ev.venue && <span>📍 {ev.venue}</span>}
                        {ev.event_time && <span>🕐 {ev.event_time}</span>}
                        {ev.event_type && <span style={{
                          padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(52,211,153,0.1)', color: '#34d399',
                          fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>{ev.event_type.replace('_', ' ')}</span>}
                      </div>
                      {ev.description && (
                        <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                          {ev.description.substring(0, 100)}{ev.description.length > 100 ? '...' : ''}
                        </p>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      {(ev.registration_type === 'individual' || ev.registration_type === 'both') && (
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Individual</div>
                          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.1rem' }}>R{ev.individual_price}</div>
                        </div>
                      )}
                      {(ev.registration_type === 'fourball' || ev.registration_type === 'both') && (
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>4-Ball</div>
                          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.1rem' }}>R{ev.fourball_price}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div style={{
            marginTop: 60, paddingTop: 32, borderTop: '1px solid var(--border)',
            textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem',
          }}>
            <img src="/logo.png" alt="" style={{ height: 40, opacity: 0.4, marginBottom: 12 }} />
            <div>AMEC Ebenezer Temple · Atteridgeville, Pretoria West</div>
            <div style={{ marginTop: 4 }}>Powered by Beatroot Pineapple</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 640px) {
          .card-hover[style] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
