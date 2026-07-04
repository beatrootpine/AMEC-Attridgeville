import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authClient as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminRaffle() {
  const { id: eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [raffles, setRaffles] = useState([])
  const [tickets, setTickets] = useState([])
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', ticket_price: '', max_tickets: '', tickets_per_person: 10 })
  const [selectedRaffle, setSelectedRaffle] = useState(null)
  const [showDraw, setShowDraw] = useState(false)
  const [drawPrize, setDrawPrize] = useState('')
  const [drawPrizeDesc, setDrawPrizeDesc] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [drawResult, setDrawResult] = useState(null)
  const [showAddPrize, setShowAddPrize] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('tickets')

  useEffect(() => { loadData() }, [eventId])

  const loadData = async () => {
    const { data: ev } = await supabase.from('events').select('title').eq('id', eventId).single()
    const { data: rs } = await supabase.from('raffles').select('*').eq('event_id', eventId).order('created_at')
    setEvent(ev)
    setRaffles(rs || [])
    if (rs?.length > 0) {
      const rid = selectedRaffle?.id || rs[0].id
      setSelectedRaffle(rs.find(r => r.id === rid) || rs[0])
      await loadRaffleData(rid)
    }
    setLoading(false)
  }

  const loadRaffleData = async (raffleId) => {
    const { data: ts } = await supabase.from('raffle_tickets').select('*').eq('raffle_id', raffleId).order('created_at', { ascending: false })
    const { data: ds } = await supabase.from('raffle_draws').select('*, raffle_tickets(ticket_number, buyer_name, buyer_email)').eq('raffle_id', raffleId).order('round_number')
    setTickets(ts || [])
    setDraws(ds || [])
  }

  const selectRaffle = async (r) => {
    setSelectedRaffle(r)
    await loadRaffleData(r.id)
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const saveRaffle = async () => {
    if (!form.title || !form.ticket_price) return toast.error('Title and price required')
    setSaving(true)
    const payload = {
      event_id: eventId, title: form.title, description: form.description,
      ticket_price: Number(form.ticket_price), max_tickets: Number(form.max_tickets) || null,
      tickets_per_person: Number(form.tickets_per_person) || 10,
    }
    let error
    if (editId) {
      ;({ error } = await supabase.from('raffles').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('raffles').insert(payload))
    }
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editId ? 'Updated' : 'Created')
    setShowForm(false); setEditId(null)
    setForm({ title: '', description: '', ticket_price: '', max_tickets: '', tickets_per_person: 10 })
    loadData()
  }

  const updateTicket = async (ticketId, updates) => {
    await supabase.from('raffle_tickets').update(updates).eq('id', ticketId)
    toast.success('Updated')
    loadRaffleData(selectedRaffle.id)
  }

  const verifyTicket = async (t) => {
    await supabase.from('raffle_tickets').update({ payment_status: 'verified', status: 'active' }).eq('id', t.id)
    toast.success(`Ticket ${t.ticket_number} activated!`)
    loadRaffleData(selectedRaffle.id)
  }

  // Draw
  const runDraw = async () => {
    if (!drawPrize) return toast.error('Enter prize name')
    setDrawing(true)
    setDrawResult(null)

    const activeTickets = tickets.filter(t => t.status === 'active')
    const alreadyWon = new Set(draws.filter(d => d.winning_ticket_id).map(d => d.winning_ticket_id))
    const eligible = activeTickets.filter(t => !alreadyWon.has(t.id))

    if (eligible.length === 0) {
      toast.error('No eligible tickets remaining')
      setDrawing(false)
      return
    }

    // Build weighted pool (1 entry per ticket quantity)
    const pool = []
    eligible.forEach(t => { for (let i = 0; i < (t.quantity || 1); i++) pool.push(t) })

    // Dramatic delay
    await new Promise(r => setTimeout(r, 2000))

    const winner = pool[Math.floor(Math.random() * pool.length)]
    const roundNum = draws.length + 1

    const { error } = await supabase.from('raffle_draws').insert({
      raffle_id: selectedRaffle.id,
      round_number: roundNum,
      prize_name: drawPrize,
      prize_description: drawPrizeDesc,
      winning_ticket_id: winner.id,
      drawn_at: new Date().toISOString(),
    })

    setDrawing(false)
    if (error) return toast.error(error.message)

    setDrawResult({ ticket: winner, prize: drawPrize, round: roundNum })
    toast.success(`Winner: ${winner.buyer_name}!`)
    setDrawPrize('')
    setDrawPrizeDesc('')
    loadRaffleData(selectedRaffle.id)
  }

  const activeCount = tickets.filter(t => t.status === 'active').length
  const pendingCount = tickets.filter(t => t.payment_status === 'pending' || t.payment_status === 'uploaded').length
  const totalRevenue = tickets.filter(t => t.payment_status === 'verified').reduce((s, t) => s + Number(t.total_amount), 0)

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <Link to={`/admin/events/${eventId}`} className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to {event?.title}</Link>
        <div className="flex justify-between items-center" style={{ marginTop: 12, marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1>🎟️ Raffle</h1>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '', ticket_price: '', max_tickets: '', tickets_per_person: 10 }) }}>+ New Raffle</button>
        </div>

        {/* Raffle selector */}
        {raffles.length > 1 && (
          <div className="tabs" style={{ marginBottom: 20 }}>
            {raffles.map(r => (
              <button key={r.id} className={`tab ${selectedRaffle?.id === r.id ? 'active' : ''}`} onClick={() => selectRaffle(r)}>{r.title}</button>
            ))}
          </div>
        )}

        {/* Create/Edit form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 16 }}>{editId ? 'Edit Raffle' : 'New Raffle'}</h2>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Grand Raffle Draw" /></div>
              <div className="form-group"><label className="form-label">Ticket Price (R) *</label><input className="form-input" type="number" value={form.ticket_price} onChange={e => set('ticket_price', e.target.value)} /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Max Tickets</label><input className="form-input" type="number" value={form.max_tickets} onChange={e => set('max_tickets', e.target.value)} placeholder="Unlimited" /></div>
              <div className="form-group"><label className="form-label">Max Per Person</label><input className="form-input" type="number" value={form.tickets_per_person} onChange={e => set('tickets_per_person', e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Prize details, rules, etc." /></div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={saveRaffle} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {selectedRaffle && (
          <>
            {/* Stats */}
            <div className="grid-4 mb-4">
              <div className="stat-card"><div className="stat-value" style={{ color: 'var(--green)' }}>{activeCount}</div><div className="stat-label">Active Tickets</div></div>
              <div className="stat-card"><div className="stat-value" style={{ color: 'var(--yellow)' }}>{pendingCount}</div><div className="stat-label">Pending</div></div>
              <div className="stat-card"><div className="stat-value" style={{ color: 'var(--gold)' }}>R{totalRevenue.toLocaleString()}</div><div className="stat-label">Revenue</div></div>
              <div className="stat-card"><div className="stat-value">{draws.length}</div><div className="stat-label">Draws Done</div></div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button className={`tab ${tab === 'tickets' ? 'active' : ''}`} onClick={() => setTab('tickets')}>Tickets ({tickets.length})</button>
              <button className={`tab ${tab === 'draw' ? 'active' : ''}`} onClick={() => setTab('draw')}>🎰 Draw</button>
              <button className={`tab ${tab === 'winners' ? 'active' : ''}`} onClick={() => setTab('winners')}>🏆 Winners ({draws.filter(d => d.winning_ticket_id).length})</button>
            </div>

            {/* Tickets Tab */}
            {tab === 'tickets' && (
              <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
                {tickets.length === 0 ? (
                  <div className="empty-state"><p>No tickets purchased yet</p></div>
                ) : (
                  <table>
                    <thead><tr><th>Ticket #</th><th>Buyer</th><th>Qty</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {tickets.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--purple)' }}>{t.ticket_number}</td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.buyer_name}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{t.buyer_email}</div>
                          </td>
                          <td>{t.quantity}</td>
                          <td style={{ fontWeight: 600 }}>R{Number(t.total_amount).toLocaleString()}</td>
                          <td><span className={`badge badge-${t.payment_status}`}>{t.payment_status}</span></td>
                          <td><span className={`badge badge-${t.status === 'active' ? 'confirmed' : t.status}`}>{t.status}</span></td>
                          <td>
                            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                              {(t.payment_status === 'uploaded' || t.payment_status === 'pending') && (
                                <button className="btn btn-success btn-sm" onClick={() => verifyTicket(t)}>✓ Verify</button>
                              )}
                              {t.payment_status === 'uploaded' && (
                                <button className="btn btn-danger btn-sm" onClick={() => updateTicket(t.id, { payment_status: 'rejected' })}>✗ Reject</button>
                              )}
                              {t.status !== 'cancelled' && (
                                <button className="btn btn-danger btn-sm" onClick={() => updateTicket(t.id, { status: 'cancelled' })}>Cancel</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Draw Tab */}
            {tab === 'draw' && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                {drawResult ? (
                  <div>
                    <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
                    <h2 style={{ marginBottom: 8, color: 'var(--gold)' }}>Round {drawResult.round} Winner!</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>Prize: {drawResult.prize}</div>
                    <div style={{ padding: 24, background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--gold)', display: 'inline-block', marginBottom: 20 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 700, color: 'var(--purple)', marginBottom: 8 }}>{drawResult.ticket.ticket_number}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>{drawResult.ticket.buyer_name}</div>
                      <div className="text-muted">{drawResult.ticket.buyer_email}</div>
                    </div>
                    <br />
                    <button className="btn btn-primary" onClick={() => setDrawResult(null)}>Next Draw →</button>
                  </div>
                ) : drawing ? (
                  <div>
                    <div style={{ fontSize: '4rem', marginBottom: 16, animation: 'spin 0.5s linear infinite' }}>🎰</div>
                    <h2>Drawing...</h2>
                    <p className="text-muted">Selecting a random winner</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎰</div>
                    <h2 style={{ marginBottom: 4 }}>Ready to Draw</h2>
                    <p className="text-muted" style={{ marginBottom: 24 }}>{activeCount} active tickets · {activeCount - draws.filter(d => d.winning_ticket_id).length} eligible</p>
                    <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
                      <div className="form-group">
                        <label className="form-label">Prize Name *</label>
                        <input className="form-input" value={drawPrize} onChange={e => setDrawPrize(e.target.value)} placeholder="e.g. R5,000 Cash Prize" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prize Description</label>
                        <input className="form-input" value={drawPrizeDesc} onChange={e => setDrawPrizeDesc(e.target.value)} placeholder="Optional details" />
                      </div>
                      <button className="btn btn-primary btn-lg btn-full" onClick={runDraw} style={{ marginTop: 8 }}>
                        🎲 Draw Winner — Round {draws.length + 1}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Winners Tab */}
            {tab === 'winners' && (
              <div style={{ display: 'grid', gap: 12 }}>
                {draws.filter(d => d.winning_ticket_id).length === 0 ? (
                  <div className="card empty-state"><p>No draws yet</p></div>
                ) : draws.filter(d => d.winning_ticket_id).map(d => (
                  <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: '1.2rem' }}>🏆</span>
                        <span style={{ fontWeight: 700, color: 'var(--gold)' }}>Round {d.round_number}</span>
                        <span className="text-muted">·</span>
                        <span style={{ fontWeight: 600 }}>{d.prize_name}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Winner: <strong>{d.raffle_tickets?.buyer_name}</strong> · Ticket {d.raffle_tickets?.ticket_number}
                      </div>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>{d.drawn_at && new Date(d.drawn_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {raffles.length === 0 && !showForm && (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎟️</div>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>No raffles yet</p>
            <p className="text-muted" style={{ marginBottom: 20 }}>Create a raffle for this event</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>Create Raffle</button>
          </div>
        )}
      </div>
    </div>
  )
}
