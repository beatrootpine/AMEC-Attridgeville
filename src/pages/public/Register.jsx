import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const KNOWN_COLS = ['full_name','email','phone','handicap','shirt_size','dietary_requirements']

export default function Register() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [regType, setRegType] = useState('individual')
  const [teamName, setTeamName] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', company: '' })
  const [players, setPlayers] = useState([])
  const [specialRequests, setSpecialRequests] = useState('')
  const [paymentFile, setPaymentFile] = useState(null)
  const [customResponses, setCustomResponses] = useState({})

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', slug).single()
      .then(({ data }) => {
        setEvent(data)
        if (data?.registration_type === 'fourball') setRegType('fourball')
        const cr = {}
        ;(data?.custom_fields || []).forEach(f => { cr[f.id] = f.type === 'checkbox' ? false : '' })
        setCustomResponses(cr)
        setLoading(false)
      })
  }, [slug])

  const defaultPlayerFields = [
    { id: 'full_name', label: 'Full Name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: false },
    { id: 'phone', label: 'Phone', type: 'tel', required: true },
    { id: 'handicap', label: 'Handicap', type: 'text', required: false },
    { id: 'shirt_size', label: 'Shirt Size', type: 'select', required: false, options: ['XS','S','M','L','XL','XXL','XXXL'] },
    { id: 'dietary_requirements', label: 'Dietary Requirements', type: 'text', required: false, placeholder: 'e.g. Halaal, Vegetarian' },
  ]
  const playerFields = (event?.player_fields && event.player_fields.length > 0) ? event.player_fields : defaultPlayerFields

  // Build empty player from field config
  const emptyPlayer = () => {
    const p = {}
    playerFields.forEach(f => { p[f.id] = f.type === 'checkbox' ? false : '' })
    return p
  }

  useEffect(() => {
    if (!event) return
    const count = regType === 'fourball' ? (event.fourball_size || 4) : 1
    setPlayers(Array.from({ length: count }, () => emptyPlayer()))
  }, [regType, event])

  const updatePlayer = (i, field, value) => {
    const u = [...players]; u[i] = { ...u[i], [field]: value }; setPlayers(u)
  }
  const setCustom = (id, value) => setCustomResponses(prev => ({ ...prev, [id]: value }))
  const amountDue = regType === 'fourball' ? Number(event?.fourball_price || 0) : Number(event?.individual_price || 0)

  const isClosedByDate = event?.registration_close_date && new Date(event.registration_close_date + 'T23:59:59') < new Date()
  const isClosed = !event?.registration_open || isClosedByDate

  const renderField = (field, value, onChange) => {
    switch (field.type) {
      case 'select':
        return (
          <select className="form-select" value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">Select</option>
            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      case 'textarea':
        return <textarea className="form-textarea" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} style={{ minHeight: 80 }} />
      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--purple)' }} />
            Yes
          </label>
        )
      default:
        return <input className="form-input" type={field.type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} />
    }
  }

  const handleSubmit = async () => {
    if (!contact.name || !contact.email || !contact.phone) return toast.error('Please fill in all contact details')

    // Validate required player fields
    for (let pi = 0; pi < players.length; pi++) {
      const missing = playerFields.filter(f => f.required && !players[pi][f.id])
      if (missing.length) return toast.error(`Player ${pi+1}: Please fill in ${missing.map(f => f.label).join(', ')}`)
    }

    const requiredCF = (event.custom_fields || []).filter(f => f.required && !customResponses[f.id])
    if (requiredCF.length) return toast.error(`Please fill in: ${requiredCF.map(f => f.label).join(', ')}`)

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
        event_id: event.id, registration_type: regType,
        team_name: regType === 'fourball' ? teamName : null,
        contact_name: contact.name, contact_email: contact.email.trim().toLowerCase(),
        contact_phone: contact.phone, company: contact.company,
        special_requests: specialRequests, amount_due: amountDue,
        payment_status: paymentFile ? 'uploaded' : 'pending',
        payment_proof_url: proofUrl, custom_responses: customResponses,
      }).select().single()
      if (regErr) throw regErr

      // Build player inserts - known columns + extra
      const playerInserts = players.map((p, i) => {
        const row = { registration_id: reg.id, player_number: i + 1 }
        const extra = {}
        Object.entries(p).forEach(([key, val]) => {
          if (KNOWN_COLS.includes(key)) row[key] = val
          else extra[key] = val
        })
        row.extra = extra
        // Ensure full_name is set
        if (!row.full_name) row.full_name = 'Player ' + (i + 1)
        return row
      })
      const { error: plErr } = await supabase.from('players').insert(playerInserts)
      if (plErr) throw plErr

      navigate('/success', { state: { regId: reg.id, eventTitle: event.title, event } })
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!event) return <div className="page container"><p>Event not found.</p></div>
  if (isClosed) return (
    <div className="page"><div className="container" style={{ maxWidth: 560, textAlign: 'center' }}>
      <div className="card" style={{ padding: 48 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
        <h2 style={{ marginBottom: 8 }}>Registration Closed</h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          {isClosedByDate ? 'The registration deadline has passed.' : 'Registration is currently closed.'}
        </p>
        <Link to={`/event/${slug}`} className="btn btn-outline" style={{ textDecoration: 'none' }}>← Back to Event</Link>
      </div>
    </div></div>
  )

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
                  background: regType === t ? 'rgba(89,26,74,0.04)' : '#fff', color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{t === 'individual' ? '🎫' : '👥'}</div>
                  <div style={{ fontWeight: 600 }}>{t === 'individual' ? (event.individual_label || 'Individual') : (event.fourball_label || '4-Ball')}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--gold)', marginTop: 4 }}>
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

        {/* Dynamic Player Fields */}
        {players.map((p, pi) => (
          <div className="form-section" key={pi}>
            <div className="form-section-title">{players.length > 1 ? `Player ${pi + 1}` : 'Player Details'}</div>
            <div className="grid-2">
              {playerFields.map(field => (
                <div className="form-group" key={field.id} style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                  <label className="form-label">{field.label} {field.required && '*'}</label>
                  {renderField(field, p[field.id], v => updatePlayer(pi, field.id, v))}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Custom Registration Fields */}
        {(event.custom_fields || []).length > 0 && (
          <div className="form-section">
            <div className="form-section-title">Additional Information</div>
            {event.custom_fields.map(field => (
              <div className="form-group" key={field.id}>
                <label className="form-label">{field.label} {field.required && '*'}</label>
                {renderField(field, customResponses[field.id], v => setCustom(field.id, v))}
              </div>
            ))}
          </div>
        )}

        {/* Special Requests */}
        {event.show_special_requests !== false && (
          <div className="form-section">
            <div className="form-section-title">Special Requests</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea className="form-textarea" value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Any special requests or notes..." />
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="form-section">
          <div className="form-section-title">Payment</div>
          {event.payment_deadline && (
            <div style={{ padding: '10px 16px', background: 'rgba(202,138,4,0.08)', border: '1px solid rgba(202,138,4,0.15)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.85rem', color: '#92400e' }}>
              ⏰ Payment deadline: <strong>{new Date(event.payment_deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </div>
          )}
          <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
            <div className="flex justify-between items-center">
              <span className="text-muted">Amount Due</span>
              <span style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--gold)' }}>R{amountDue}</span>
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
              <div style={{ marginTop: 10, padding: 10, background: 'rgba(89,26,74,0.04)', borderRadius: 'var(--radius)', fontSize: '0.82rem' }}>
                <strong>Your reference:</strong>{' '}
                {regType === 'fourball'
                  ? <span style={{ color: 'var(--purple)' }}>{teamName || 'Your Team Name'}</span>
                  : <span style={{ color: 'var(--purple)' }}>{contact.name || 'Name & Surname'}</span>
                }
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Upload Proof of Payment</label>
            <div className={`file-upload ${paymentFile ? 'has-file' : ''}`} onClick={() => document.getElementById('pop-upload').click()}>
              {paymentFile ? (
                <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div><div style={{ fontWeight: 600 }}>{paymentFile.name}</div><div className="text-muted mt-1">{(paymentFile.size/1024).toFixed(0)} KB</div></>
              ) : (
                <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📎</div><div style={{ fontWeight: 500 }}>Click to upload</div><div className="text-muted mt-1">PDF, JPG or PNG — Max 5MB</div></>
              )}
            </div>
            <input id="pop-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => setPaymentFile(e.target.files[0])} />
            <div className="form-hint">You can also upload later via <a href="/my-registration">My Registration</a></div>
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : `Submit Registration — R${amountDue}`}
        </button>
      </div>
    </div>
  )
}
