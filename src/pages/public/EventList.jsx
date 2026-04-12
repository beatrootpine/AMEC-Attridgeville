import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

export default function EventList() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('events').select('*').order('event_date', { ascending: true })
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmtTime = (t) => t ? t.substring(0, 5) : ''

  return (
    <>
      {/* Hero */}
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
            <div style={{ display: 'grid', gap: 20 }}>
              {events.map(ev => (
                <Link key={ev.id} to={`/event/${ev.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="ev-card">
                    {ev.banner_url && (
                      <div className="ev-card-img">
                        <img src={ev.banner_url} alt="" />
                        {!ev.registration_open && <div className="ev-closed-tag">Closed</div>}
                      </div>
                    )}
                    <div className="ev-card-body">
                      <div className="ev-card-date">
                        <span className="ev-day">{format(new Date(ev.event_date), 'd')}</span>
                        <span className="ev-month">{format(new Date(ev.event_date), 'MMM yyyy')}</span>
                      </div>
                      <div className="ev-card-info">
                        <h3 className="ev-card-title">{ev.title}</h3>
                        <div className="ev-card-meta">
                          {ev.venue && <span>📍 {ev.venue}</span>}
                          {ev.event_time && <span>🕐 {fmtTime(ev.event_time)}</span>}
                          {ev.event_type && <span className="ev-type">{ev.event_type.replace(/_/g, ' ')}</span>}
                        </div>
                        {ev.description && <p className="ev-card-desc">{ev.description.substring(0, 120)}{ev.description.length > 120 ? '...' : ''}</p>}
                        <div className="ev-card-prices">
                          {(ev.registration_type === 'individual' || ev.registration_type === 'both') && (
                            <span className="ev-price-tag">{ev.individual_label || 'Individual'}: <strong>R{ev.individual_price}</strong></span>
                          )}
                          {(ev.registration_type === 'fourball' || ev.registration_type === 'both') && (
                            <span className="ev-price-tag">{ev.fourball_label || '4-Ball'}: <strong>R{ev.fourball_price}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

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
          min-height: 400px; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 56px 20px;
        }
        .hero-bg { position: absolute; inset: 0; background: url('/church.jpg') center center / cover no-repeat; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(89,26,74,0.92), rgba(60,18,50,0.88) 50%, rgba(30,10,25,0.94)); }
        .hero-inner { position: relative; z-index: 1; max-width: 600px; }
        .hero-logo { height: 76px; margin-bottom: 14px; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4)); }
        .hero-subtitle { font-size: 0.62rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
        .hero-title { font-size: clamp(1.5rem, 5vw, 2.2rem); color: #fff; margin-bottom: 4px; line-height: 1.2; }
        .hero-location { color: rgba(255,255,255,0.4); font-size: 0.82rem; margin-bottom: 14px; }
        .hero-divider { width: 40px; height: 2px; background: rgba(212,168,50,0.5); margin: 0 auto 12px; }
        .hero-motto { color: rgba(255,255,255,0.35); font-size: 0.75rem; font-style: italic; margin-bottom: 22px; }
        .hero-ctas { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .hero-btn-outline {
          padding: 12px 28px; border-radius: var(--radius); background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.2); color: #fff; font-weight: 600; font-size: 0.88rem; text-decoration: none !important;
        }

        /* Event Cards */
        .ev-card {
          background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg);
          overflow: hidden; box-shadow: var(--shadow-sm); transition: all 0.2s; cursor: pointer;
          display: flex; flex-direction: row;
        }
        .ev-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); border-color: var(--border-strong); }

        .ev-card-img {
          width: 240px; min-height: 160px; flex-shrink: 0; position: relative; overflow: hidden;
        }
        .ev-card-img img { width: 100%; height: 100%; object-fit: cover; }
        .ev-closed-tag {
          position: absolute; top: 10px; left: 10px; padding: 3px 10px; border-radius: 4px;
          background: rgba(220,38,38,0.9); color: #fff; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
        }

        .ev-card-body { flex: 1; padding: 20px; display: flex; gap: 16px; align-items: flex-start; }

        .ev-card-date {
          display: flex; flex-direction: column; align-items: center; padding: 10px 12px;
          background: rgba(89,26,74,0.05); border: 1px solid rgba(89,26,74,0.08);
          border-radius: var(--radius); min-width: 54px; flex-shrink: 0;
        }
        .ev-day { font-size: 1.4rem; font-weight: 700; color: var(--purple); line-height: 1; }
        .ev-month { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-top: 2px; }

        .ev-card-info { flex: 1; min-width: 0; }
        .ev-card-title { font-size: 1.05rem; margin-bottom: 6px; line-height: 1.3; }
        .ev-card-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px; }
        .ev-type {
          padding: 1px 8px; border-radius: 4px; background: rgba(22,163,74,0.08);
          color: var(--green); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 700;
        }
        .ev-card-desc { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 10px; }

        .ev-card-prices { display: flex; gap: 10px; flex-wrap: wrap; }
        .ev-price-tag {
          padding: 4px 12px; border-radius: 6px; font-size: 0.75rem;
          background: rgba(184,134,11,0.06); color: var(--text-secondary);
        }
        .ev-price-tag strong { color: var(--gold); }

        .site-footer {
          margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border);
          text-align: center; font-size: 0.75rem; color: var(--text-dim);
        }

        @media (max-width: 640px) {
          .hero { min-height: 320px; padding: 36px 16px; }
          .hero-logo { height: 52px; }
          .hero-title { font-size: 1.3rem; }
          .hero-ctas .btn, .hero-btn-outline { padding: 10px 20px; font-size: 0.82rem; }

          .ev-card { flex-direction: column; }
          .ev-card-img { width: 100%; min-height: 140px; max-height: 180px; }
          .ev-card-body { padding: 16px; gap: 12px; }
          .ev-card-date { padding: 8px 10px; }
          .ev-day { font-size: 1.2rem; }
          .ev-card-title { font-size: 0.95rem; }
        }
      `}</style>
    </>
  )
}
