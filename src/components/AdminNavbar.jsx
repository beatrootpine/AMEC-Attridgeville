import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminNavbar() {
  const { signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = (p) => location.pathname === p ? 'active' : ''

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/admin" className="navbar-brand">⛳ Admin</Link>
        <div className="navbar-links">
          <Link to="/admin" className={isActive('/admin')}>Dashboard</Link>
          <Link to="/admin/events/new" className={isActive('/admin/events/new')}>New Event</Link>
          <Link to="/" className="hide-mobile">View Site</Link>
          <button onClick={handleSignOut} className="btn btn-outline btn-sm">Sign Out</button>
        </div>
      </div>
    </nav>
  )
}
