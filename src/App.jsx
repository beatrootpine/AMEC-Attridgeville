import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import AdminNavbar from './components/AdminNavbar'
import EventList from './pages/public/EventList'
import EventDetail from './pages/public/EventDetail'
import Register from './pages/public/Register'
import Success from './pages/public/Success'
import MyRegistration from './pages/public/MyRegistration'
import SponsorPage from './pages/public/SponsorPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEvent from './pages/admin/AdminEvent'
import AdminEventForm from './pages/admin/AdminEventForm'
import AdminRegistration from './pages/admin/AdminRegistration'
import AdminSponsors from './pages/admin/AdminSponsors'

function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!user) return <Navigate to="/admin/login" />
  if (!isAdmin) return (
    <div className="page">
      <div className="container" style={{ maxWidth: 480, textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔒</div>
        <h1 style={{ marginBottom: 8 }}>Access Denied</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>Your account is not registered as an admin.</p>
        <a href="/" className="btn btn-outline">← Back to Home</a>
      </div>
    </div>
  )
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public — no auth dependency */}
      <Route path="/" element={<><Navbar /><EventList /></>} />
      <Route path="/event/:slug" element={<><Navbar /><EventDetail /></>} />
      <Route path="/event/:slug/register" element={<><Navbar /><Register /></>} />
      <Route path="/event/:slug/sponsor" element={<><Navbar /><SponsorPage /></>} />
      <Route path="/success" element={<><Navbar /><Success /></>} />
      <Route path="/my-registration" element={<><Navbar /><MyRegistration /></>} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminNavbar /><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/events/new" element={<ProtectedRoute><AdminNavbar /><AdminEventForm /></ProtectedRoute>} />
      <Route path="/admin/events/:id/edit" element={<ProtectedRoute><AdminNavbar /><AdminEventForm /></ProtectedRoute>} />
      <Route path="/admin/events/:id" element={<ProtectedRoute><AdminNavbar /><AdminEvent /></ProtectedRoute>} />
      <Route path="/admin/events/:eventId/registrations/:regId" element={<ProtectedRoute><AdminNavbar /><AdminRegistration /></ProtectedRoute>} />
      <Route path="/admin/events/:id/sponsors" element={<ProtectedRoute><AdminNavbar /><AdminSponsors /></ProtectedRoute>} />
    </Routes>
  )
}
