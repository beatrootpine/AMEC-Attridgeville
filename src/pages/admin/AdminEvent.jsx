import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authClient as supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function InvoiceLink({ regId }) {
  const [invId, setInvId] = useState(null)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    supabase.from('invoices').select('id').eq('registration_id', regId).maybeSingle()
      .then(({ data }) => { setInvId(data?.id || null); setChecked(true) })
  }, [regId])
  if (!checked) return null
  if (invId) return <Link to={'/admin/invoices/' + invId} className='btn btn-outline btn-sm' style={{ textDecoration: 'none' }}>🧾 Invoice</Link>
  return null
}

export default function AdminEvent() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [regs, setRegs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [showAddReg, setShowAddReg] = useState(false)
  const [addingReg, setAddingReg] = useState(false)
  const [newReg, setNewReg] = useState({ contact_name: '', contact_email: '', contact_phone: '', company: '', registration_type: 'fourball', team_name: '', player1: '', player2: '', player3: '', player4: '' })
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

  const createInvoice = async (regId, amountDue, paymentDeadline) => {
    // Check if invoice already exists
    const { data: existing } = await supabase.from('invoices').select('id').eq('registration_id', regId).single()
    if (existing) return existing.id
    const { data: inv } = await supabase.from('invoices').insert({
      registration_id: regId,
      amount_due: amountDue,
      status: 'unpaid',
      due_date: paymentDeadline || null,
    }).select().single()
    return inv?.id
  }

  const deleteRegistration = async (reg) => {
    if (!window.confirm(`Permanently delete ${reg.contact_name}'s registration? This cannot be undone.`)) return
    // Delete players first, then invoice, then registration
    await supabase.from('players').delete().eq('registration_id', reg.id)
    await supabase.from('invoices').delete().eq('registration_id', reg.id)
    const { error } = await supabase.from('registrations').delete().eq('id', reg.id)
    if (error) return toast.error(error.message)
    toast.success('Registration deleted')
    loadData()
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

  const handleAddReg = async () => {
    if (!newReg.contact_name || !newReg.contact_email || !newReg.contact_phone) return toast.error('Name, email and phone are required')
    setAddingReg(true)
    try {
      const isFourball = newReg.registration_type === 'fourball'
      const amountDue = isFourball ? Number(event.fourball_price || 0) : Number(event.individual_price || 0)

      const { data: reg, error: regErr } = await supabase.from('registrations').insert({
        event_id: id,
        registration_type: newReg.registration_type,
        team_name: isFourball ? newReg.team_name : null,
        contact_name: newReg.contact_name,
        contact_email: newReg.contact_email.trim().toLowerCase(),
        contact_phone: newReg.contact_phone,
        company: newReg.company,
        amount_due: amountDue,
        status: 'pending',
        payment_status: 'pending',
      }).select().single()
      if (regErr) throw regErr

      // Insert players
      const playerNames = [newReg.player1, newReg.player2, newReg.player3, newReg.player4].filter(Boolean)
      const playersToInsert = isFourball
        ? playerNames.map((name, i) => ({ registration_id: reg.id, player_number: i + 1, full_name: name || ('Player ' + (i+1)), extra: {} }))
        : [{ registration_id: reg.id, player_number: 1, full_name: newReg.contact_name, extra: {} }]
      if (playersToInsert.length) await supabase.from('players').insert(playersToInsert)

      // Create invoice
      await supabase.from('invoices').insert({
        registration_id: reg.id,
        amount_due: amountDue,
        status: 'unpaid',
        due_date: event.payment_deadline || null,
      })

      toast.success('Registration added & invoice created!')
      setShowAddReg(false)
      setNewReg({ contact_name: '', contact_email: '', contact_phone: '', company: '', registration_type: 'fourball', team_name: '', player1: '', player2: '', player3: '', player4: '' })
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to add registration')
    } finally { setAddingReg(false) }
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
  const [sendingEmail, setSendingEmail] = useState(false)

  const getEmailRecipients = () => {
    let list = regs
    if (emailFilter === 'confirmed') list = list.filter(r => r.status === 'confirmed')
    if (emailFilter === 'pending') list = list.filter(r => r.status === 'pending')
    if (emailFilter === 'unpaid') list = list.filter(r => r.payment_status === 'pending')
    return [...new Set(list.map(r => r.contact_email))]
  }

  const sendBulkEmail = async () => {
    const recipients = getEmailRecipients()
    if (recipients.length === 0) return toast.error('No recipients match this filter')
    if (!emailSubject.trim()) return toast.error('Please enter a subject')
    if (!emailBody.trim()) return toast.error('Please enter a message')
    if (!window.confirm(`Send email to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}?`)) return

    setSendingEmail(true)
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${SUPABASE_URL}/functions/v1/sendgrid-broadcast`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject: emailSubject, body: emailBody, event_title: event.title }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(`Sent to ${data.sent} of ${data.total} recipients!`)
      setShowEmail(false)
      setEmailSubject('')
      setEmailBody('')
    } catch (err) {
      toast.error(err.message || 'Failed to send')
    } finally { setSendingEmail(false) }
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
            <button className="btn btn-outline btn-sm" onClick={() => setShowAddReg(true)}>+ Add Registration</button>
            <Link to={`/admin/events/${id}/sponsors`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>🏆 Sponsors</Link>
            <Link to={`/admin/events/${id}/raffle`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>🎟️ Raffle</Link>
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
                        <InvoiceLink regId={r.id} />
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
                        <button className="btn btn-danger btn-sm" style={{ opacity: 0.7 }} onClick={() => deleteRegistration(r)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Registration Modal */}
        {showAddReg && (
          <div className='modal-overlay' onClick={() => setShowAddReg(false)}>
            <div className='modal' onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>Add Registration</h2>
                <button onClick={() => setShowAddReg(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className='form-group'>
                <label className='form-label'>Type</label>
                <select className='form-select' value={newReg.registration_type} onChange={e => setNewReg(p => ({ ...p, registration_type: e.target.value }))}>
                  <option value='fourball'>4-Ball — R{event.fourball_price || 0}</option>
                  <option value='individual'>Individual — R{event.individual_price || 0}</option>
                </select>
              </div>
              {newReg.registration_type === 'fourball' && (
                <div className='form-group'>
                  <label className='form-label'>Team Name</label>
                  <input className='form-input' value={newReg.team_name} onChange={e => setNewReg(p => ({ ...p, team_name: e.target.value }))} placeholder='e.g. The Eagles' />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className='form-group'>
                  <label className='form-label'>Contact Name *</label>
                  <input className='form-input' value={newReg.contact_name} onChange={e => setNewReg(p => ({ ...p, contact_name: e.target.value }))} />
                </div>
                <div className='form-group'>
                  <label className='form-label'>Company</label>
                  <input className='form-input' value={newReg.company} onChange={e => setNewReg(p => ({ ...p, company: e.target.value }))} />
                </div>
                <div className='form-group'>
                  <label className='form-label'>Email *</label>
                  <input className='form-input' type='email' value={newReg.contact_email} onChange={e => setNewReg(p => ({ ...p, contact_email: e.target.value }))} />
                </div>
                <div className='form-group'>
                  <label className='form-label'>Phone *</label>
                  <input className='form-input' type='tel' value={newReg.contact_phone} onChange={e => setNewReg(p => ({ ...p, contact_phone: e.target.value }))} />
                </div>
              </div>
              {newReg.registration_type === 'fourball' && (
                <>
                  <div className='form-section-title' style={{ marginTop: 8, marginBottom: 12, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Player Names</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {['player1','player2','player3','player4'].map((p, i) => (
                      <div className='form-group' key={p}>
                        <label className='form-label'>Player {i+1}</label>
                        <input className='form-input' value={newReg[p]} onChange={e => setNewReg(prev => ({ ...prev, [p]: e.target.value }))} placeholder={'Player ' + (i+1) + ' name'} />
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(74,32,128,0.06)', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
                💰 Invoice will be auto-generated for <strong>R{newReg.registration_type === 'fourball' ? (event.fourball_price || 0) : (event.individual_price || 0)}</strong>
              </div>
              <button className='btn btn-primary' style={{ width: '100%' }} onClick={handleAddReg} disabled={addingReg}>
                {addingReg ? 'Adding...' : 'Add Registration & Generate Invoice'}
              </button>
            </div>
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
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={sendBulkEmail} disabled={sendingEmail}>
                  {sendingEmail ? 'Sending...' : `Send to ${getEmailRecipients().length} Recipients`}
                </button>
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
