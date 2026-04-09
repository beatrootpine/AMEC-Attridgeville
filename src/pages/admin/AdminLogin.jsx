import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) return toast.error('Enter email and password')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) return toast.error(error.message)
    navigate('/admin')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div className="text-center mb-4">
          <img src="/logo.png" alt="AMEC" style={{ height: 72, width: 'auto', marginBottom: 12 }} />
          <h1 style={{ color: 'var(--gold)', marginBottom: 8 }}>Admin Login</h1>
          <p className="text-muted">AMEC Event Management</p>
        </div>
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@church.co.za" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <button className="btn btn-primary btn-full btn-lg" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </div>
        <div className="text-center mt-4">
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Back to public site</Link>
        </div>
      </div>
    </div>
  )
}
