import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const emptyPlayer = { full_name: '', email: '', phone: '', handicap: '', shirt_size: '', dietary_requirements: '' }

export default function Register() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [regType, setRegType] = useState('individual')
  const [teamName, setTeamName] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', company: '' })
  const [players, setPlayers] = useState([{ ...emptyPlayer }])
  const [specialRequests, setSpecialRequests] = useState('')
  const [paymentFile, setPaymentFile] = useState(null)
  const [customResponses, setCustomResponses] = useState({})

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', slug).single()
      .then(({ data }) => {
        setEvent(data)
        if (data?.registration_type === 'fourball') setRegType('fourball')
        // Init custom responses
        const cr = {}
        ;(data?.custom_fields || []).forEach(f => { cr[f.id] = f.type === 'checkbox' ? false : '' })
        setCustomResponses(cr)
        setLoading(false)
      })
  }, [slug])

  useEffect(() => {
    if (regType === 'individual') setPlayers([{ ...emptyPlayer }])
    else setPlayers([{ ...emptyPlayer }, { ...emptyPlayer }, { ...emptyPlayer }, { ...emptyPlayer }])
  }, [regType])

  const updatePlayer = (i, field, value) => {
    const updated = [...players]
    updated[i] = { ...updated[i], [field]: value }
    setPlayers(updated)
  }

  const setCustom = (id, value) => setCustomResponses(prev => ({ ...prev, [id]: value }))

  const amountDue = regType === 'fourball' ? Number(event?.fourball_price || 0) : Number(event?.individual_price || 0)

  // Check if registration is closed by date
  const isClosedByDate = event?.registration_close_date && new Date(event.registration_close_date + 'T23:59:59') < new Date()
  const isClosed = !event?.registration_open || isClosedByDate

  const handleSubmit = async () => {
    if (!contact.name || !contact.email || !contact.phone) return toast.error('Please fill in all contact details')
    if (players.some(p => !p.full_name)) return toast.error('Please fill in all player names')

    // Validate required custom fields
    const requiredMissing = (event.custom_fields || []).filter(f => f.required && !customResponses[f.id])
    if (requiredMissing.length > 0) return toast.error(`Please fill in: ${requiredMissing.map(f => f.label).join(', ')}`)

    setSubmitting(true)
    try {
      let proofUrl = null
      if (paymentFile) {
        const ext = paymentFile.name.split('.').pop()
        const path = `${event.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, paymentFile)
        if (upErr) throw upErr
        proofUrl = path
      }

      const { data: reg, error: regErr } = await supabase.from('registrations').insert({
        event_id: event.id,
        registration_type: regType,
        team_name: regType === 'fourball' ? teamName : null,
        contact_name: contact.name,
        contact_email: contact.email.trim().toLowerCase(),
        contact_phone: contact.phone,
        company: contact.company,
        special_requests: specialRequests,
        amount_due: amountDue,
        payment_status: paymentFile ? 'uploaded' : 'pending',
        payment_proof_url: proofUrl,
        custom_responses: customResponses,
      }).select().single()
      if (regErr) throw regErr

      const playerInserts = players.map((p, i) => ({
        registration_id: reg.id, full_name: p.full_name, email: p.email,
        phone: p.phone, handicap: p.handicap, shirt_size: p.shirt_size,
        dietary_requirements: p.dietary_requirements, player_number: i + 1,
      }))
      const { error: plErr } = await supabase.from('players').insert(playerInserts)
      if (plErr) throw plErr

      navigate('/success', { state: { regId: reg.id, eventTitle: event.title } })
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!event) return <div className="page container"><p>Event not found.</p></div>

  if (isClosed) return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560, textAlign: 'center' }}>
        <div className="card" style={{ padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
          <h2 style={{ marginBottom: 8 }}>Registration Closed</h2>
          <p className="text-muted" style={{ marginBottom: 24 }}>
            {isClosedByDate ? 'The registration deadline for this event has passed.' : 'Registration is currently closed for this event.'}
          </p>
          <Link to={`/event/${slug}`} className="btn btn-outline" style={{ textDecoration: 'none' }}>← Back to Event</Link>
        </div>
      </div>
    </div>
  )

  const isGolf = event.event_type === 'golf_day'

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 style={{ marginBottom: 4 }}>Register</h1>
        <p className="text-muted mb-4">{event.title}</p>

        {/* Registration Type */}
        {event.registration_type === 'both' && (
          <div className="form-section">
            <div className="form-section-title">Registration Type</div>
            <div className="grid-2">
              {['individual', 'fourball'].map(t => (
                <button key={t} onClick={() => setRegType(t)} style={{
                  padding: 20, borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'center',
                  border: regType === t ? '2px solid var(--purple)' : '1px solid var(--border)',
                  background: regType === t ? 'var(--purple-glow)' : '#fff', color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{t === 'individual' ? '🏌️' : '👥'}</div>
                  <div style={{ fontWeight: 600 }}>{t === 'individual' ? 'Individual' : '4-Ball'}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--gold)', marginTop: 4, fontWeight: 700 }}>
                    R{t === 'individual' ? event.individual_price : event.fourball_price}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {regType === 'fourball' && (
          <div className="form-section">
            <div className="form-section-title">Team Details</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Team Name</label>
              <input className="form-input" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Eagles" />
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="form-section">
          <div className="form-section-title">Contact Person</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={contact.company} onChange={e => setContact({ ...contact, company: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" type="tel" value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Players */}
        {players.map((p, i) => (
          <div className="form-section" key={i}>
            <div className="form-section-title">
              {regType === 'fourball' ? `Player ${i + 1}` : 'Player Details'}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={p.full_name} onChange={e => updatePlayer(i, 'full_name', e.target.value)} />
              </div>
              {isGolf && (
                <div className="form-group">
                  <label className="form-label">Handicap</label>
                  <input className="form-input" value={p.handicap} onChange={e => updatePlayer(i, 'handicap', e.target.value)} placeholder="e.g. 18" />
                </div>
              )}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={p.email} onChange={e => updatePlayer(i, 'email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" value={p.phone} onChange={e => updatePlayer(i, 'phone', e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Shirt Size</label>
                <select className="form-select" value={p.shirt_size} onChange={e => updatePlayer(i, 'shirt_size', e.target.value)}>
                  <option value="">Select</option>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dietary Requirements</label>
                <input className="form-input" value={p.dietary_requirements} onChange={e => updatePlayer(i, 'dietary_requirements', e.target.value)} placeholder="e.g. Halaal, Vegetarian" />
              </div>
            </div>
          </div>
        ))}

        {/* Custom Fields */}
        {(event.custom_fields || []).length > 0 && (
          <div className="form-section">
            <div className="form-section-title">Additional Information</div>
            {event.custom_fields.map(field => (
              <div className="form-group" key={field.id}>
                <label className="form-label">{field.label} {field.required && '*'}</label>
                {field.type === 'text' && (
                  <input className="form-input" value={customResponses[field.id] || ''} onChange={e => setCustom(field.id, e.target.value)} placeholder={field.placeholder || ''} />
                )}
                {field.type === 'number' && (
                  <input className="form-input" type="number" value={customResponses[field.id] || ''} onChange={e => setCustom(field.id, e.target.value)} placeholder={field.placeholder || ''} />
                )}
                {field.type === 'textarea' && (
                  <textarea className="form-textarea" value={customResponses[field.id] || ''} onChange={e => setCustom(field.id, e.target.value)} placeholder={field.placeholder || ''} />
                )}
                {field.type === 'select' && (
                  <select className="form-select" value={customResponses[field.id] || ''} onChange={e => setCustom(field.id, e.target.value)}>
                    <option value="">Select...</option>
                    {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {field.type === 'checkbox' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={!!customResponses[field.id]} onChange={e => setCustom(field.id, e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--purple)' }} />
                    Yes
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Special Requests */}
        <div className="form-section">
          <div className="form-section-title">Special Requests</div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <textarea className="form-textarea" value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Any special requests or notes..." />
          </div>
        </div>

        {/* Payment */}
        <div className="form-section">
          <div className="form-section-title">Payment</div>
          <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
            <div className="flex justify-between items-center">
              <span className="text-muted">Amount Due</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 700 }}>R{amountDue}</span>
            </div>
          </div>

          {event.banking_name && (
            <div style={{ marginBottom: 20, padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>EFT Banking Details</div>
              <div><span className="text-muted">Account:</span> {event.banking_name}</div>
              <div><span className="text-muted">Bank:</span> {event.banking_bank}</div>
              <div><span className="text-muted">Acc No:</span> {event.banking_account_no}</div>
              <div><span className="text-muted">Branch:</span> {event.banking_branch_code}</div>
              {event.banking_reference_note && <div style={{ marginTop: 8, color: 'var(--gold)', fontStyle: 'italic', fontSize: '0.8rem' }}>{event.banking_reference_note}</div>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Upload Proof of Payment</label>
            <div className={`file-upload ${paymentFile ? 'has-file' : ''}`} onClick={() => document.getElementById('pop-upload').click()}>
              {paymentFile ? (
                <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div><div style={{ fontWeight: 600 }}>{paymentFile.name}</div><div className="text-muted mt-1">{(paymentFile.size / 1024).toFixed(0)} KB</div></>
              ) : (
                <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📎</div><div style={{ fontWeight: 500 }}>Click to upload</div><div className="text-muted mt-1">PDF, JPG or PNG — Max 5MB</div></>
              )}
            </div>
            <input id="pop-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => setPaymentFile(e.target.files[0])} />
            <div className="form-hint">You can also upload proof of payment later</div>
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : `Submit Registration — R${amountDue}`}
        </button>
      </div>
    </div>
  )
}
