import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import AdminNavbar from './components/AdminNavbar'
import EventList from './pages/public/EventList'
import EventDetail from './pages/public/EventDetail'
import Register from './pages/public/Register'
import Success from './pages/public/Success'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEvent from './pages/admin/AdminEvent'
import AdminEventForm from './pages/admin/AdminEventForm'
import AdminRegistration from './pages/admin/AdminRegistration'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!user) return <Navigate to="/admin/login" />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<><Navbar /><EventList /></>} />
      <Route path="/event/:slug" element={<><Navbar /><EventDetail /></>} />
      <Route path="/event/:slug/register" element={<><Navbar /><Register /></>} />
      <Route path="/success" element={<><Navbar /><Success /></>} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminNavbar /><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/events/new" element={<ProtectedRoute><AdminNavbar /><AdminEventForm /></ProtectedRoute>} />
      <Route path="/admin/events/:id/edit" element={<ProtectedRoute><AdminNavbar /><AdminEventForm /></ProtectedRoute>} />
      <Route path="/admin/events/:id" element={<ProtectedRoute><AdminNavbar /><AdminEvent /></ProtectedRoute>} />
      <Route path="/admin/events/:eventId/registrations/:regId" element={<ProtectedRoute><AdminNavbar /><AdminRegistration /></ProtectedRoute>} />
    </Routes>
  )
}
