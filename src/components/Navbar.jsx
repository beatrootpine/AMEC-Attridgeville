import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="AMEC" style={{ height: 36, width: 'auto' }} />
          <span>AMEC Events</span>
        </Link>
        <div className="navbar-links">
          <Link to="/">Events</Link>
          <Link to="/admin/login">Admin</Link>
        </div>
      </div>
    </nav>
  )
}
