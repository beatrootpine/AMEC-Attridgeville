import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminEvent() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [regs, setRegs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).single()
    const { data: rs } = await supabase.from('registrations').select('*, players(*)').eq('event_id', id).order('created_at', { ascending: false })
    setEvent(ev)
    setRegs(rs || [])
    setLoading(false)
  }

  const updateStatus = async (regId, status) => {
    await supabase.from('registrations').update({ status }).eq('id', regId)
    toast.success(`Registration ${status}`)
    loadData()
  }

  const updatePayment = async (regId, payment_status) => {
    const updates = { payment_status }
    if (payment_status === 'verified') updates.status = 'confirmed'
    await supabase.from('registrations').update(updates).eq('id', regId)
    toast.success(`Payment ${payment_status}`)
    loadData()
  }

  const filtered = filter === 'all' ? regs : regs.filter(r => r.status === filter || r.payment_status === filter)

  const playerCount = regs.reduce((sum, r) => sum + (r.players?.length || 0), 0)
  const confirmedRev = regs.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + Number(r.amount_due), 0)

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!event) return <div className="page container"><p>Event not found.</p></div>

  return (
    <div className="page">
      <div className="container">
        <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link to="/admin" className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to Dashboard</Link>
            <h1 style={{ marginTop: 8 }}>{event.title}</h1>
            <p className="text-muted">{format(new Date(event.event_date), 'EEEE, d MMMM yyyy')} · {event.venue}</p>
          </div>
          <Link to={`/admin/events/${id}/edit`} className="btn btn-outline">Edit Event</Link>
        </div>

        <div className="grid-4 mb-4">
          {[
            { label: 'Registrations', value: regs.length },
            { label: 'Total Players', value: playerCount },
            { label: 'Pending Payment', value: regs.filter(r => r.payment_status === 'pending' || r.payment_status === 'uploaded').length, color: 'var(--yellow)' },
            { label: 'Confirmed Revenue', value: `R${confirmedRev.toLocaleString()}`, color: 'var(--green)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-value" style={{ color: s.color || 'var(--gold)' }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="tabs">
          {['all', 'pending', 'confirmed', 'cancelled', 'uploaded'].map(t => (
            <button key={t} className={`tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'all' ? `(${regs.length})` : `(${regs.filter(r => r.status === t || r.payment_status === t).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><p>No registrations match this filter.</p></div>
        ) : (
          <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Players</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.contact_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.contact_email}</div>
                      {r.team_name && <div className="text-muted" style={{ fontSize: '0.75rem' }}>Team: {r.team_name}</div>}
                    </td>
                    <td><span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>{r.registration_type === 'fourball' ? '4-Ball' : 'Individual'}</span></td>
                    <td>{r.players?.length || 0}</td>
                    <td style={{ fontWeight: 600 }}>R{Number(r.amount_due).toLocaleString()}</td>
                    <td><span className={`badge badge-${r.payment_status}`}>{r.payment_status}</span></td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <Link to={`/admin/events/${id}/registrations/${r.id}`} className="btn btn-outline btn-sm">View</Link>
                        {r.payment_status === 'uploaded' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => updatePayment(r.id, 'verified')}>Verify</button>
                            <button className="btn btn-danger btn-sm" onClick={() => updatePayment(r.id, 'rejected')}>Reject</button>
                          </>
                        )}
                        {r.status === 'pending' && r.payment_status !== 'uploaded' && (
                          <button className="btn btn-success btn-sm" onClick={() => updateStatus(r.id, 'confirmed')}>Confirm</button>
                        )}
                        {r.status !== 'cancelled' && (
                          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'cancelled')}>Cancel</button>
                        )}
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
