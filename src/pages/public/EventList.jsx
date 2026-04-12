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
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Hero with church image */}
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-inner">
          <img src="/logo.png" alt="AMEC" className="hero-logo" />
          <div className="hero-subtitle">African Methodist Episcopal Church</div>
          <h1 className="hero-title">Ebenezer Temple</h1>
          <p className="hero-location">93 Sehlogo Street, Atteridgeville, Pretoria West</p>
          <div className="hero-divider" />
          <p className="hero-motto">"God Our Father · Christ Our Redeemer · Man Our Brother"</p>
          <div className="hero-ctas">
            <a href="#events" className="btn btn-gold btn-lg">View Events ↓</a>
            <Link to="/my-registration" className="btn hero-btn-outline btn-lg">My Registration</Link>
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
            <div style={{ display: 'grid', gap: 20 }}>
              {events.map(ev => (
                <Link key={ev.id} to={`/event/${ev.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card card-hover event-card">
                    {/* Banner image */}
                    {ev.banner_url && (
                      <div className="event-banner">
                        <img src={ev.banner_url} alt="" />
                      </div>
                    )}
                    <div className="event-card-body">
                      {/* Date */}
                      <div className="event-date-block">
                        <div className="event-date-num">{format(new Date(ev.event_date), 'd')}</div>
                        <div className="event-date-month">{format(new Date(ev.event_date), 'MMM')}</div>
                        <div className="event-date-year">{format(new Date(ev.event_date), 'yyyy')}</div>
                      </div>

                      {/* Info */}
                      <div className="event-info">
                        <h3 className="event-title">{ev.title}</h3>
                        <div className="event-meta">
                          {ev.venue && <span>📍 {ev.venue}</span>}
                          {ev.event_time && <span>🕐 {ev.event_time}</span>}
                          {ev.event_type && (
                            <span className="event-type-badge">{ev.event_type.replace(/_/g, ' ')}</span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="event-desc">{ev.description.substring(0, 100)}{ev.description.length > 100 ? '...' : ''}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="event-price">
                        <div className="event-price-label">From</div>
                        <div className="event-price-value">R{ev.individual_price || ev.fourball_price}</div>
                        {!ev.registration_open && <div className="event-closed-badge">Closed</div>}
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
            <div>AMEC Ebenezer Temple · 93 Sehlogo Street, Atteridgeville, Pretoria West</div>
            <div style={{ marginTop: 4 }}>Powered by <span style={{ color: 'var(--text-muted)' }}>Beatroot Pineapple</span></div>
          </div>
        </div>
      </div>

      <style>{`
        .hero {
          position: relative; overflow: hidden;
          min-height: 420px; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 60px 20px;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background: url('/church.jpg') center center / cover no-repeat;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(160deg, rgba(89,26,74,0.92) 0%, rgba(60,18,50,0.88) 50%, rgba(30,10,25,0.94) 100%);
        }
        .hero-inner { position: relative; z-index: 1; max-width: 600px; }
        .hero-logo { height: 80px; margin-bottom: 16px; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4)); }
        .hero-subtitle {
          font-size: 0.65rem; font-weight: 700; letter-spacing: 3px;
          text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 10px;
        }
        .hero-title {
          font-size: clamp(1.6rem, 5vw, 2.4rem); color: #fff;
          margin-bottom: 6px; line-height: 1.2;
        }
        .hero-location { color: rgba(255,255,255,0.45); font-size: 0.85rem; margin-bottom: 16px; }
        .hero-divider {
          width: 48px; height: 2px; background: rgba(212,168,50,0.5);
          margin: 0 auto 14px;
        }
        .hero-motto {
          color: rgba(255,255,255,0.4); font-size: 0.78rem; font-style: italic;
          margin-bottom: 24px; letter-spacing: 0.3px;
        }
        .hero-ctas { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .hero-btn-outline {
          padding: 12px 28px; border-radius: var(--radius);
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
          color: #fff; font-weight: 600; font-size: 0.9rem; text-decoration: none !important;
        }

        .event-card { padding: 0; overflow: hidden; }
        .event-banner {
          width: 100%; height: 180px; overflow: hidden;
          border-bottom: 1px solid var(--border);
        }
        .event-banner img { width: 100%; height: 100%; object-fit: cover; }
        .event-card-body {
          display: flex; align-items: center; gap: 18px; padding: 20px;
        }
        .event-date-block {
          background: rgba(89,26,74,0.06); border: 1px solid rgba(89,26,74,0.1);
          border-radius: var(--radius); padding: 12px 14px; text-align: center;
          min-width: 58px; flex-shrink: 0;
        }
        .event-date-num { font-size: 1.5rem; font-weight: 700; color: var(--purple); line-height: 1; }
        .event-date-month { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-top: 2px; }
        .event-date-year { font-size: 0.55rem; color: var(--text-dim); }
        .event-info { flex: 1; min-width: 0; }
        .event-title { font-size: 1.05rem; margin-bottom: 4px; }
        .event-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.78rem; color: var(--text-muted); }
        .event-type-badge {
          padding: 1px 8px; border-radius: 4px;
          background: rgba(22,163,74,0.08); color: var(--green);
          font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600;
        }
        .event-desc { margin-top: 6px; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; }
        .event-price { text-align: right; flex-shrink: 0; }
        .event-price-label { font-size: 0.55rem; color: var(--text-dim); text-transform: uppercase; }
        .event-price-value { font-weight: 700; color: var(--gold); font-size: 1.15rem; }
        .event-closed-badge {
          font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
          color: var(--red); margin-top: 4px;
        }

        .site-footer {
          margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border);
          text-align: center; font-size: 0.75rem; color: var(--text-dim);
        }

        @media (max-width: 640px) {
          .hero { min-height: 340px; padding: 40px 16px; }
          .hero-logo { height: 56px; }
          .hero-title { font-size: 1.4rem; }
          .hero-ctas .btn, .hero-btn-outline { padding: 10px 20px; font-size: 0.82rem; }
          .event-banner { height: 140px; }
          .event-card-body { flex-wrap: wrap; gap: 12px; padding: 14px 16px; }
          .event-date-block { padding: 8px 10px; min-width: auto; }
          .event-date-num { font-size: 1.2rem; }
          .event-info { width: calc(100% - 74px); }
          .event-title { font-size: 0.92rem; }
          .event-price { width: 100%; text-align: left; display: flex; align-items: center; gap: 8px;
            padding-top: 10px; border-top: 1px solid var(--border); }
        }
      `}</style>
    </>
  )
}
