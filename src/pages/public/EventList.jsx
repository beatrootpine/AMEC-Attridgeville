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
      .order('event_date', { ascending: true })
      .then(({ data, error }) => { setEvents(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div className="hero-dots" />
        <div className="hero-inner">
          <img src="/logo.png" alt="AMEC" className="hero-logo" />
          <div className="hero-subtitle">African Methodist Episcopal Church</div>
          <h1 className="hero-title">Ebenezer Temple</h1>
          <p className="hero-location">Atteridgeville, Pretoria West</p>
          <div className="hero-ctas">
            <a href="#events" className="btn btn-gold">View Events ↓</a>
            <Link to="/my-registration" className="btn hero-btn-outline">My Registration</Link>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="page" style={{ paddingTop: 24 }} id="events">
        <div className="container">
          <div style={{ marginBottom: 24 }}>
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
            <div style={{ display: 'grid', gap: 12 }}>
              {events.map(ev => (
                <Link key={ev.id} to={`/event/${ev.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card card-hover event-card">
                    {/* Date */}
                    <div className="event-date-block">
                      <div className="event-date-num">{format(new Date(ev.event_date), 'd')}</div>
                      <div className="event-date-month">{format(new Date(ev.event_date), 'MMM yyyy')}</div>
                    </div>

                    {/* Info */}
                    <div className="event-info">
                      <h3 className="event-title">{ev.title}</h3>
                      <div className="event-meta">
                        {ev.venue && <span>📍 {ev.venue}</span>}
                        {ev.event_time && <span>🕐 {ev.event_time}</span>}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="event-price">
                      <div className="event-price-label">From</div>
                      <div className="event-price-value">
                        R{ev.registration_type === 'fourball' && ev.registration_type !== 'both' ? ev.fourball_price : ev.individual_price}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="site-footer">
            <img src="/logo.png" alt="" style={{ height: 36, opacity: 0.3, marginBottom: 10 }} />
            <div>AMEC Ebenezer Temple · Atteridgeville, Pretoria West</div>
            <div style={{ marginTop: 4 }}>Powered by <span style={{ color: 'var(--text-muted)' }}>Beatroot Pineapple</span></div>
          </div>
        </div>
      </div>

      <style>{`
        .hero {
          position: relative; overflow: hidden;
          background: linear-gradient(160deg, #6e2a5e 0%, #591a4a 30%, #3d1233 100%);
          padding: 56px 20px 48px; text-align: center;
        }
        .hero-dots {
          position: absolute; inset: 0; opacity: 0.06;
          background-image: radial-gradient(circle, #fff 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .hero-inner { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
        .hero-logo { height: 72px; margin-bottom: 14px; filter: drop-shadow(0 4px 16px rgba(0,0,0,0.3)); }
        .hero-subtitle {
          font-size: 0.62rem; font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; color: rgba(255,255,255,0.6); margin-bottom: 8px;
        }
        .hero-title {
          font-size: clamp(1.4rem, 5vw, 2.2rem); color: #fff;
          margin-bottom: 4px; line-height: 1.2;
        }
        .hero-location { color: rgba(255,255,255,0.5); font-size: 0.88rem; margin-bottom: 22px; }
        .hero-ctas { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .hero-btn-outline {
          padding: 10px 24px; border-radius: var(--radius);
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22);
          color: #fff; font-weight: 600; font-size: 0.88rem; text-decoration: none;
        }

        .event-card {
          display: flex; align-items: center; gap: 18px; padding: 18px 20px;
        }
        .event-date-block {
          background: rgba(89,26,74,0.06); border: 1px solid rgba(89,26,74,0.1);
          border-radius: var(--radius); padding: 12px 16px; text-align: center;
          min-width: 62px; flex-shrink: 0;
        }
        .event-date-num { font-size: 1.5rem; font-weight: 700; color: var(--purple); line-height: 1; }
        .event-date-month { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-top: 2px; }
        .event-info { flex: 1; min-width: 0; }
        .event-title { font-size: 1rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .event-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.78rem; color: var(--text-muted); }
        .event-price { text-align: right; flex-shrink: 0; }
        .event-price-label { font-size: 0.58rem; color: var(--text-dim); text-transform: uppercase; }
        .event-price-value { font-weight: 700; color: var(--gold); font-size: 1.1rem; }

        .site-footer {
          margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border);
          text-align: center; font-size: 0.75rem; color: var(--text-dim);
        }

        @media (max-width: 640px) {
          .hero { padding: 40px 16px 36px; }
          .hero-logo { height: 56px; margin-bottom: 10px; }
          .hero-title { font-size: 1.4rem; }
          .hero-ctas .btn, .hero-btn-outline { padding: 10px 20px; font-size: 0.82rem; }

          .event-card { flex-wrap: wrap; gap: 12px; padding: 14px 16px; }
          .event-date-block { padding: 8px 12px; min-width: auto; }
          .event-date-num { font-size: 1.2rem; }
          .event-info { width: calc(100% - 80px); }
          .event-title { font-size: 0.92rem; white-space: normal; }
          .event-price { width: 100%; text-align: left; display: flex; align-items: center; gap: 6px;
            padding-top: 8px; border-top: 1px solid var(--border); }
          .event-price-label { font-size: 0.65rem; }
          .event-price-value { font-size: 0.95rem; }
        }
      `}</style>
    </>
  )
}
