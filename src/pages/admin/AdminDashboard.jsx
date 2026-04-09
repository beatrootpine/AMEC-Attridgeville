import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

export default function AdminDashboard() {
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

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

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h1>Dashboard</h1>
          <Link to="/admin/events/new" className="btn btn-primary">+ New Event</Link>
        </div>

        <div className="grid-4 mb-4">
          {[
            { label: 'Total Registrations', value: stats.total, color: 'var(--text)' },
            { label: 'Pending', value: stats.pending, color: 'var(--yellow)' },
            { label: 'Confirmed', value: stats.confirmed, color: 'var(--green)' },
            { label: 'Confirmed Revenue', value: `R${stats.revenue.toLocaleString()}`, color: 'var(--gold)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No events yet.</p>
            <Link to="/admin/events/new" className="btn btn-primary mt-3">Create Your First Event</Link>
          </div>
        ) : (
          <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
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
                        <Link to={`/admin/events/${ev.id}`} className="btn btn-outline btn-sm">View</Link>
                        <Link to={`/admin/events/${ev.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
