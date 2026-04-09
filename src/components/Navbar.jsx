import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isActive = (p) => location.pathname === p ? 'active' : ''
  const [open, setOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="AMEC" style={{ height: 32 }} />
          <span>AMEC Events</span>
        </Link>
        {/* Desktop links */}
        <div className="navbar-links nav-desktop">
          <Link to="/" className={isActive('/')}>Events</Link>
          <Link to="/my-registration" className={isActive('/my-registration')}>My Registration</Link>
          <Link to="/admin/login">Admin</Link>
        </div>
        {/* Mobile hamburger */}
        <button className="nav-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>
      {/* Mobile dropdown */}
      {open && (
        <div className="nav-mobile" onClick={() => setOpen(false)}>
          <Link to="/" className={isActive('/')}>Events</Link>
          <Link to="/my-registration" className={isActive('/my-registration')}>My Registration</Link>
          <Link to="/admin/login">Admin</Link>
        </div>
      )}
      <style>{`
        .nav-desktop { display: flex; }
        .nav-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 6px; flex-direction: column; gap: 4px; }
        .nav-hamburger span { display: block; width: 20px; height: 2px; background: var(--text-muted); border-radius: 2px; }
        .nav-mobile { display: none; }
        @media (max-width: 640px) {
          .nav-desktop { display: none; }
          .nav-hamburger { display: flex; }
          .nav-mobile {
            display: flex; flex-direction: column; gap: 0;
            border-top: 1px solid var(--border); background: #fff;
          }
          .nav-mobile a {
            padding: 12px 20px; font-size: 0.88rem; color: var(--text-secondary);
            text-decoration: none; border-bottom: 1px solid var(--border);
          }
          .nav-mobile a:hover, .nav-mobile a.active { color: var(--purple); background: var(--purple-glow); }
        }
      `}</style>
    </nav>
  )
}
