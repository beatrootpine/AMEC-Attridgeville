import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function RafflePage() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [raffles, setRaffles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRaffle, setSelectedRaffle] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [paymentFile, setPaymentFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [draws, setDraws] = useState([])

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', slug).single().then(async ({ data: ev }) => {
      setEvent(ev)
      if (ev) {
        const { data: rs } = await supabase.from('raffles').select('*').eq('event_id', ev.id).eq('is_active', true).order('created_at')
        setRaffles(rs || [])
        if (rs?.length > 0) {
          setSelectedRaffle(rs[0])
          const { data: ds } = await supabase.from('raffle_draws').select('*, raffle_tickets(buyer_name, ticket_number)').eq('raffle_id', rs[0].id).order('round_number')
          setDraws(ds || [])
        }
      }
      setLoading(false)
    })
  }, [slug])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const generateTicketNumber = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = 'RF-'
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
  }

  const handleSubmit = async () => {
    if (!selectedRaffle) return
    if (!form.name || !form.email || !form.phone) return toast.error('Please fill in all details')
    if (quantity < 1) return toast.error('Select at least 1 ticket')

    setSubmitting(true)
    try {
      let proofUrl = null
      if (paymentFile) {
        const ext = paymentFile.name.split('.').pop()
        const path = `raffle/${selectedRaffle.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, paymentFile)
        if (upErr) throw upErr
        proofUrl = path
      }

      const ticketNumber = generateTicketNumber()
      const totalAmount = quantity * Number(selectedRaffle.ticket_price)

      const { data, error } = await supabase.from('raffle_tickets').insert({
        raffle_id: selectedRaffle.id,
        ticket_number: ticketNumber,
        buyer_name: form.name,
        buyer_email: form.email.trim().toLowerCase(),
        buyer_phone: form.phone,
        quantity,
        total_amount: totalAmount,
        payment_status: paymentFile ? 'uploaded' : 'pending',
        payment_proof_url: proofUrl,
      }).select().single()

      if (error) throw error
      setSuccess({ ticketNumber, quantity, total: totalAmount })
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!event) return <div className="page container"><p>Event not found.</p></div>

  const total = selectedRaffle ? quantity * Number(selectedRaffle.ticket_price) : 0

  if (success) return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card text-center" style={{ padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎟️</div>
          <h1 style={{ marginBottom: 8 }}>Ticket Reserved!</h1>
          <p className="text-muted" style={{ marginBottom: 20 }}>Your raffle ticket will be activated once payment is verified.</p>
          <div style={{
            padding: 24, background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
            border: '2px dashed var(--border-strong)', marginBottom: 24, display: 'inline-block',
          }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>Your Ticket Number</div>
            <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, color: 'var(--purple)', letterSpacing: 2 }}>{success.ticketNumber}</div>
            <div className="text-muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>{success.quantity} ticket{success.quantity > 1 ? 's' : ''} · R{success.total.toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/event/${slug}`} className="btn btn-outline" style={{ textDecoration: 'none' }}>← Back to Event</Link>
            <Link to="/my-registration" className="btn btn-outline" style={{ textDecoration: 'none' }}>My Registration</Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 680 }}>
        <Link to={`/event/${slug}`} className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to {event.title}</Link>
        <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎟️</div>
          <h1 style={{ marginBottom: 6 }}>Raffle <span className="text-gold">Tickets</span></h1>
          <p className="text-muted">{event.title}</p>
        </div>

        {raffles.length === 0 ? (
          <div className="empty-state"><p>No active raffles for this event.</p></div>
        ) : (
          <>
            {/* Raffle info */}
            {selectedRaffle && (
              <div className="card" style={{ marginBottom: 24, textAlign: 'center' }}>
                <h2 style={{ marginBottom: 6 }}>{selectedRaffle.title}</h2>
                {selectedRaffle.description && <p className="text-muted" style={{ marginBottom: 16, whiteSpace: 'pre-line' }}>{selectedRaffle.description}</p>}
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--gold)' }}>R{Number(selectedRaffle.ticket_price)}</div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>per ticket</div>
              </div>
            )}

            {/* Winners board */}
            {draws.filter(d => d.winning_ticket_id).length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12 }}>🏆 Winners</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {draws.filter(d => d.winning_ticket_id).map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--gold)', marginRight: 8 }}>Round {d.round_number}</span>
                        <span style={{ fontWeight: 600 }}>{d.prize_name}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        <strong>{d.raffle_tickets?.buyer_name}</strong>
                        <span className="text-muted" style={{ marginLeft: 6, fontFamily: 'monospace' }}>{d.raffle_tickets?.ticket_number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase form */}
            <div className="form-section">
              <div className="form-section-title">Buy Tickets</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input className="form-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Tickets</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="btn btn-outline" style={{ width: 40, padding: '8px 0' }}>−</button>
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(selectedRaffle?.tickets_per_person || 10, quantity + 1))} className="btn btn-outline" style={{ width: 40, padding: '8px 0' }}>+</button>
                  <span className="text-muted" style={{ fontSize: '0.82rem' }}>Max {selectedRaffle?.tickets_per_person || 10} per person</span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="form-section">
              <div className="form-section-title">Payment</div>
              <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
                <div className="flex justify-between items-center">
                  <span className="text-muted">{quantity} ticket{quantity > 1 ? 's' : ''} × R{Number(selectedRaffle?.ticket_price)}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--gold)' }}>R{total.toLocaleString()}</span>
                </div>
              </div>
              {event.banking_name && (
                <div style={{ marginBottom: 20, padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>EFT Banking Details</div>
                  <div><span className="text-muted">Account:</span> {event.banking_name}</div>
                  <div><span className="text-muted">Bank:</span> {event.banking_bank}</div>
                  <div><span className="text-muted">Acc No:</span> {event.banking_account_no}</div>
                  <div><span className="text-muted">Branch:</span> {event.banking_branch_code}</div>
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(89,26,74,0.04)', borderRadius: 'var(--radius)', fontSize: '0.8rem' }}>
                    <strong>Reference:</strong> <span style={{ color: 'var(--purple)' }}>RAFFLE - {form.name || 'Your Name'}</span>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Upload Proof of Payment</label>
                <div className={`file-upload ${paymentFile ? 'has-file' : ''}`} onClick={() => document.getElementById('raffle-pop').click()}>
                  {paymentFile ? (
                    <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div><div style={{ fontWeight: 600 }}>{paymentFile.name}</div></>
                  ) : (
                    <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📎</div><div style={{ fontWeight: 500 }}>Click to upload</div><div className="text-muted mt-1">PDF, JPG or PNG</div></>
                  )}
                </div>
                <input id="raffle-pop" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => setPaymentFile(e.target.files[0])} />
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''} — R${total.toLocaleString()}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
