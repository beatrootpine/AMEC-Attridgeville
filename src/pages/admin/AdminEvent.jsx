import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authClient as supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminEvent() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [regs, setRegs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailFilter, setEmailFilter] = useState('all')

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

  // Export CSV
  const exportCSV = () => {
    const customFields = event?.custom_fields || []
    const headers = [
      'Ref', 'Date', 'Type', 'Team', 'Contact Name', 'Email', 'Phone', 'Company',
      'Status', 'Payment Status', 'Amount Due', 'Special Requests',
      ...customFields.map(f => f.label),
      'Player 1', 'P1 Email', 'P1 Phone', 'P1 Handicap', 'P1 Shirt', 'P1 Dietary',
      'Player 2', 'P2 Email', 'P2 Phone', 'P2 Handicap', 'P2 Shirt', 'P2 Dietary',
      'Player 3', 'P3 Email', 'P3 Phone', 'P3 Handicap', 'P3 Shirt', 'P3 Dietary',
      'Player 4', 'P4 Email', 'P4 Phone', 'P4 Handicap', 'P4 Shirt', 'P4 Dietary',
    ]

    const rows = regs.map(r => {
      const players = (r.players || []).sort((a, b) => a.player_number - b.player_number)
      const cr = r.custom_responses || {}
      const playerCols = []
      for (let i = 0; i < 4; i++) {
        const p = players[i]
        playerCols.push(p?.full_name || '', p?.email || '', p?.phone || '', p?.handicap || '', p?.shirt_size || '', p?.dietary_requirements || '')
      }
      return [
        r.id.substring(0, 8).toUpperCase(),
        format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
        r.registration_type === 'fourball' ? '4-Ball' : 'Individual',
        r.team_name || '',
        r.contact_name, r.contact_email, r.contact_phone, r.company || '',
        r.status, r.payment_status, r.amount_due, r.special_requests || '',
        ...customFields.map(f => {
          const val = cr[f.id]
          return val === true ? 'Yes' : val === false ? 'No' : (val || '')
        }),
        ...playerCols,
      ]
    })

    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '-')}-attendees-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  // Bulk email
  const getEmailRecipients = () => {
    let list = regs
    if (emailFilter === 'confirmed') list = list.filter(r => r.status === 'confirmed')
    if (emailFilter === 'pending') list = list.filter(r => r.status === 'pending')
    if (emailFilter === 'unpaid') list = list.filter(r => r.payment_status === 'pending')
    return [...new Set(list.map(r => r.contact_email))]
  }

  const sendBulkEmail = () => {
    const recipients = getEmailRecipients()
    if (recipients.length === 0) return toast.error('No recipients match this filter')
    if (!emailSubject.trim()) return toast.error('Please enter a subject')

    // Open default mail client with BCC
    const mailto = `mailto:?bcc=${recipients.join(',')}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    window.open(mailto, '_blank')
    toast.success(`Opening mail client for ${recipients.length} recipients`)
    setShowEmail(false)
  }

  const copyEmails = () => {
    const recipients = getEmailRecipients()
    navigator.clipboard.writeText(recipients.join('; '))
    toast.success(`${recipients.length} email addresses copied`)
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
            <Link to="/admin" className="text-muted" style={{ fontSize: '0.8rem' }}>← Dashboard</Link>
            <h1 style={{ marginTop: 8 }}>{event.title}</h1>
            <p className="text-muted">
              {format(new Date(event.event_date), 'EEEE, d MMMM yyyy')} · {event.venue}
              {event.registration_close_date && (
                <span> · Closes {format(new Date(event.registration_close_date), 'd MMM yyyy')}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>📥 Export CSV</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowEmail(true)}>✉️ Email All</button>
            <Link to={`/admin/events/${id}/sponsors`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>🏆 Sponsors</Link>
            <Link to={`/admin/events/${id}/edit`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>Edit Event</Link>
          </div>
        </div>

        <div className="grid-4 mb-4">
          {[
            { label: 'Registrations', value: regs.length },
            { label: 'Total Players', value: playerCount },
            { label: 'Pending Payment', value: regs.filter(r => r.payment_status === 'pending' || r.payment_status === 'uploaded').length, color: 'var(--yellow)' },
            { label: 'Confirmed Revenue', value: `R${confirmedRev.toLocaleString()}`, color: 'var(--green)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-value" style={{ color: s.color || 'var(--purple)' }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="tabs">
          {['all', 'pending', 'confirmed', 'cancelled', 'uploaded'].map(t => (
            <button key={t} className={`tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'all' ? regs.length : regs.filter(r => r.status === t || r.payment_status === t).length})
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
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.contact_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.contact_email}</div>
                      {r.team_name && <div className="text-muted" style={{ fontSize: '0.72rem' }}>Team: {r.team_name}</div>}
                    </td>
                    <td><span className="badge" style={{ background: 'var(--purple-glow)', color: 'var(--purple)' }}>{r.registration_type === 'fourball' ? '4-Ball' : 'Individual'}</span></td>
                    <td>{r.players?.length || 0}</td>
                    <td style={{ fontWeight: 600 }}>R{Number(r.amount_due).toLocaleString()}</td>
                    <td><span className={`badge badge-${r.payment_status}`}>{r.payment_status}</span></td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <Link to={`/admin/events/${id}/registrations/${r.id}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>View</Link>
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

        {/* Bulk Email Modal */}
        {showEmail && (
          <div className="modal-overlay" onClick={() => setShowEmail(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>Email Attendees</h2>
                <button onClick={() => setShowEmail(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>

              <div className="form-group">
                <label className="form-label">Send To</label>
                <select className="form-select" value={emailFilter} onChange={e => setEmailFilter(e.target.value)}>
                  <option value="all">All Registrants ({[...new Set(regs.map(r => r.contact_email))].length})</option>
                  <option value="confirmed">Confirmed Only ({[...new Set(regs.filter(r => r.status === 'confirmed').map(r => r.contact_email))].length})</option>
                  <option value="pending">Pending Only ({[...new Set(regs.filter(r => r.status === 'pending').map(r => r.contact_email))].length})</option>
                  <option value="unpaid">Unpaid Only ({[...new Set(regs.filter(r => r.payment_status === 'pending').map(r => r.contact_email))].length})</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={`Update: ${event.title}`} />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Type your message..." style={{ minHeight: 140 }} />
              </div>

              <div className="flex gap-2">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={sendBulkEmail}>Open in Mail Client</button>
                <button className="btn btn-outline" onClick={copyEmails}>Copy Emails</button>
              </div>
              <div className="form-hint mt-2">This opens your default mail app with all recipients in BCC. You can also copy the email list to paste into any email tool.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
