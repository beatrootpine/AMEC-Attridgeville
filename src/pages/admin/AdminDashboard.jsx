import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { authClient } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  // Admin management
  const [admins, setAdmins] = useState([])
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)

  useEffect(() => { loadData(); loadAdmins() }, [])

  const loadData = async () => {
    const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false })
    const { data: regs } = await supabase.from('registrations').select('id, event_id, status, payment_status, amount_due')

    const regMap = {}
    let total = 0, pending = 0, confirmed = 0, revenue = 0
    ;(regs || []).forEach(r => {
      if (!regMap[r.event_id]) regMap[r.event_id] = { total: 0, pending: 0, confirmed: 0, revenue: 0 }
      regMap[r.event_id].total++
      total++
      if (r.status === 'pending') { regMap[r.event_id].pending++; pending++ }
      if (r.status === 'confirmed') { regMap[r.event_id].confirmed++; confirmed++; revenue += Number(r.amount_due) }
    })

    setEvents((evts || []).map(e => ({ ...e, stats: regMap[e.id] || { total: 0, pending: 0, confirmed: 0, revenue: 0 } })))
    setStats({ total, pending, confirmed, revenue })
    setLoading(false)
  }

  const loadAdmins = async () => {
    const { data } = await supabase.from('admins').select('*').order('created_at', { ascending: true })
    setAdmins(data || [])
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminPassword) return toast.error('Email and password are required')
    if (newAdminPassword.length < 6) return toast.error('Password must be at least 6 characters')

    setAddingAdmin(true)
    try {
      // Create the user via Supabase Auth admin invite
      // Since we can't use admin API from client, we sign them up
      // and then add them to the admins table
      const { data: signUpData, error: signUpErr } = await authClient.auth.signUp({
        email: newAdminEmail.trim().toLowerCase(),
        password: newAdminPassword,
      })

      if (signUpErr) throw signUpErr
      if (!signUpData.user) throw new Error('Failed to create user')

      // Add to admins table
      const { error: adminErr } = await supabase.from('admins').insert({
        user_id: signUpData.user.id,
        email: newAdminEmail.trim().toLowerCase(),
        name: newAdminName.trim() || null,
      })

      if (adminErr) throw adminErr

      toast.success(`Admin added: ${newAdminEmail}`)
      setNewAdminEmail('')
      setNewAdminName('')
      setNewAdminPassword('')
      setShowAddAdmin(false)
      loadAdmins()
    } catch (err) {
      toast.error(err.message || 'Failed to add admin')
    } finally { setAddingAdmin(false) }
  }

  const removeAdmin = async (admin) => {
    if (admins.length <= 1) return toast.error("Can't remove the last admin")
    if (!window.confirm(`Remove ${admin.email} as admin?`)) return
    await supabase.from('admins').delete().eq('id', admin.id)
    toast.success('Admin removed')
    loadAdmins()
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h1>Dashboard</h1>
          <Link to="/admin/events/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>+ New Event</Link>
        </div>

        <div className="grid-4 mb-4">
          {[
            { label: 'Total Registrations', value: stats.total, color: 'var(--text)' },
            { label: 'Pending', value: stats.pending, color: 'var(--yellow)' },
            { label: 'Confirmed', value: stats.confirmed, color: 'var(--green)' },
            { label: 'Revenue', value: `R${stats.revenue.toLocaleString()}`, color: 'var(--gold)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Events Table */}
        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No events yet.</p>
            <Link to="/admin/events/new" className="btn btn-primary mt-3" style={{ textDecoration: 'none' }}>Create Your First Event</Link>
          </div>
        ) : (
          <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden', marginBottom: 32 }}>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Registrations</th>
                  <th>Pending</th>
                  <th>Confirmed</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 600 }}>{ev.title}</td>
                    <td className="text-muted">{format(new Date(ev.event_date), 'd MMM yyyy')}</td>
                    <td>{ev.stats.total}</td>
                    <td><span className="badge badge-pending">{ev.stats.pending}</span></td>
                    <td><span className="badge badge-confirmed">{ev.stats.confirmed}</span></td>
                    <td><span className={`badge ${ev.registration_open ? 'badge-confirmed' : 'badge-cancelled'}`}>{ev.registration_open ? 'Open' : 'Closed'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <Link to={`/admin/events/${ev.id}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>View</Link>
                        <Link to={`/admin/events/${ev.id}/edit`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>Edit</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Admin Management */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 2 }}>Admin Users</h2>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Manage who has access to this dashboard</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddAdmin(!showAddAdmin)}>
              {showAddAdmin ? 'Cancel' : '+ Add Admin'}
            </button>
          </div>

          {/* Add Admin Form */}
          {showAddAdmin && (
            <div style={{
              padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              background: 'var(--bg)', marginBottom: 20,
            }}>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="admin@church.co.za" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Name</label>
                  <input className="form-input" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} placeholder="Full name (optional)" />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0, maxWidth: 320 }}>
                  <label className="form-label">Temporary Password *</label>
                  <input className="form-input" type="text" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} placeholder="Min 6 characters" />
                  <div className="form-hint">Share this with the new admin so they can sign in. They can change it later.</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleAddAdmin} disabled={addingAdmin}>
                {addingAdmin ? 'Adding...' : 'Create Admin Account'}
              </button>
            </div>
          )}

          {/* Admin List */}
          {admins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No admins found. Seed your first admin via the SQL migration.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {admins.map(a => (
                <div key={a.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', background: 'var(--bg)',
                  flexWrap: 'wrap', gap: 8,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.name || a.email}</div>
                    {a.name && <div className="text-muted" style={{ fontSize: '0.78rem' }}>{a.email}</div>}
                    <div className="text-dim" style={{ fontSize: '0.7rem' }}>Added {format(new Date(a.created_at), 'd MMM yyyy')}</div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeAdmin(a)}
                    disabled={admins.length <= 1}
                    title={admins.length <= 1 ? "Can't remove the last admin" : 'Remove admin'}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
