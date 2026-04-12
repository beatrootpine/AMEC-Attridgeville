import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { adminSignOut } from '../lib/useAdmin'

export default function AdminNavbar() {
  const location = useLocation()
  const isActive = (p) => location.pathname === p ? 'active' : ''
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await adminSignOut()
    window.location.href = '/admin/login'
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/admin" className="navbar-brand">
          <img src="/logo.png" alt="AMEC" style={{ height: 32 }} />
          <span>Admin</span>
        </Link>
        <div className="navbar-links nav-desktop-admin">
          <Link to="/admin" className={isActive('/admin')}>Dashboard</Link>
          <Link to="/admin/events/new" className={isActive('/admin/events/new')}>New Event</Link>
          <Link to="/">View Site</Link>
          <button onClick={handleSignOut} className="btn btn-outline btn-sm">Sign Out</button>
        </div>
        <button className="nav-hamburger-admin" onClick={() => setOpen(!open)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <div className="nav-mobile-admin" onClick={() => setOpen(false)}>
          <Link to="/admin" className={isActive('/admin')}>Dashboard</Link>
          <Link to="/admin/events/new" className={isActive('/admin/events/new')}>New Event</Link>
          <Link to="/">View Site</Link>
          <a href="#" onClick={e => { e.preventDefault(); handleSignOut() }} style={{ color: 'var(--red)' }}>Sign Out</a>
        </div>
      )}
      <style>{`
        .nav-desktop-admin { display: flex; align-items: center; gap: 20px; }
        .nav-hamburger-admin { display: none; background: none; border: none; cursor: pointer; padding: 6px; flex-direction: column; gap: 4px; }
        .nav-hamburger-admin span { display: block; width: 20px; height: 2px; background: var(--text-muted); border-radius: 2px; }
        .nav-mobile-admin { display: none; }
        @media (max-width: 640px) {
          .nav-desktop-admin { display: none; }
          .nav-hamburger-admin { display: flex; }
          .nav-mobile-admin {
            display: flex; flex-direction: column;
            border-top: 1px solid var(--border); background: #fff;
          }
          .nav-mobile-admin a {
            padding: 12px 20px; font-size: 0.88rem; color: var(--text-secondary);
            text-decoration: none; border-bottom: 1px solid var(--border);
          }
          .nav-mobile-admin a:hover, .nav-mobile-admin a.active { color: var(--purple); background: rgba(89,26,74,0.04); }
        }
      `}</style>
    </nav>
  )
}
