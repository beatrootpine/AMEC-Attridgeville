import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isActive = (p) => location.pathname === p ? 'active' : ''

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="AMEC" style={{ height: 34, width: 'auto' }} />
          <span>AMEC Events</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className={isActive('/')}>Events</Link>
          <Link to="/my-registration" className={isActive('/my-registration')}>My Registration</Link>
          <Link to="/admin/login" className="hide-mobile">Admin</Link>
        </div>
      </div>
    </nav>
  )
}
