import { useLocation, Link } from 'react-router-dom'

export default function Success() {
  const { state } = useLocation()

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card text-center" style={{ padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <h1 style={{ marginBottom: 8 }}>You're Registered!</h1>
          {state?.eventTitle && <p className="text-muted mb-3">{state.eventTitle}</p>}
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 32 }}>
            Thank you for registering. You'll receive a confirmation once your payment has been verified.
            If you haven't uploaded proof of payment yet, please do so as soon as possible.
          </p>
          {state?.regId && (
            <div style={{ padding: 12, background: 'var(--gold-glow)', borderRadius: 'var(--radius)', marginBottom: 24, fontSize: '0.85rem' }}>
              <span className="text-muted">Reference:</span> <span className="text-gold" style={{ fontWeight: 600 }}>{state.regId.substring(0, 8).toUpperCase()}</span>
            </div>
          )}
          <Link to="/" className="btn btn-outline">← Back to Events</Link>
        </div>
      </div>
    </div>
  )
}
