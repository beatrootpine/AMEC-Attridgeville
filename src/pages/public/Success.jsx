import { useLocation, Link } from 'react-router-dom'
import { generateICS } from '../../lib/calendar'

export default function Success() {
  const { state } = useLocation()

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card text-center" style={{ padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <h1 style={{ marginBottom: 8 }}>{state?.isSponsor ? 'Sponsorship Submitted!' : "You're Registered!"}</h1>
          {state?.eventTitle && <p className="text-muted mb-3">{state.eventTitle}</p>}
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 32 }}>
            {state?.isSponsor
              ? 'Thank you for your sponsorship interest. Our team will be in touch to confirm the details and next steps.'
              : "Thank you for registering. You'll receive a confirmation once your payment has been verified. If you haven't uploaded proof of payment yet, please do so as soon as possible."
            }
          </p>
          {state?.regId && (
            <div style={{ padding: 12, background: 'rgba(89,26,74,0.04)', borderRadius: 'var(--radius)', marginBottom: 24, fontSize: '0.85rem' }}>
              <span className="text-muted">Reference:</span> <span style={{ fontWeight: 700, color: 'var(--purple)', letterSpacing: 0.5 }}>{state.regId.substring(0, 8).toUpperCase()}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {state?.event && (
              <button onClick={() => generateICS(state.event)} className="btn btn-primary">
                📅 Add to Calendar
              </button>
            )}
            <Link to="/" className="btn btn-outline" style={{ textDecoration: 'none' }}>← Back to Events</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
