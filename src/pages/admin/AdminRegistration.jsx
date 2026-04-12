import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authClient as supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminRegistration() {
  const { eventId, regId } = useParams()
  const [reg, setReg] = useState(null)
  const [proofUrl, setProofUrl] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [regId])

  const loadData = async () => {
    const { data } = await supabase.from('registrations').select('*, players(*), events(title)').eq('id', regId).single()
    setReg(data)
    setNotes(data?.admin_notes || '')
    if (data?.payment_proof_url) {
      const { data: urlData } = await supabase.storage.from('payment-proofs').createSignedUrl(data.payment_proof_url, 3600)
      setProofUrl(urlData?.signedUrl)
    }
    setLoading(false)
  }

  const updateField = async (updates) => {
    await supabase.from('registrations').update(updates).eq('id', regId)
    toast.success('Updated')
    loadData()
  }

  const saveNotes = async () => {
    await supabase.from('registrations').update({ admin_notes: notes }).eq('id', regId)
    toast.success('Notes saved')
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!reg) return <div className="page container"><p>Registration not found.</p></div>

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <Link to={`/admin/events/${eventId}`} className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to {reg.events?.title || 'Event'}</Link>
        <div className="flex justify-between items-center" style={{ marginTop: 12, marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>{reg.contact_name}</h1>
            <p className="text-muted">Ref: {reg.id.substring(0, 8).toUpperCase()} · {format(new Date(reg.created_at), 'd MMM yyyy, HH:mm')}</p>
          </div>
          <div className="flex gap-2">
            <span className={`badge badge-${reg.status}`}>{reg.status}</span>
            <span className={`badge badge-${reg.payment_status}`}>{reg.payment_status}</span>
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Contact Info */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Contact Details</h3>
            <div style={{ display: 'grid', gap: 10, fontSize: '0.9rem' }}>
              <div><span className="text-muted">Name:</span> {reg.contact_name}</div>
              <div><span className="text-muted">Email:</span> <a href={`mailto:${reg.contact_email}`}>{reg.contact_email}</a></div>
              <div><span className="text-muted">Phone:</span> <a href={`tel:${reg.contact_phone}`}>{reg.contact_phone}</a></div>
              {reg.company && <div><span className="text-muted">Company:</span> {reg.company}</div>}
              {reg.team_name && <div><span className="text-muted">Team:</span> {reg.team_name}</div>}
              <div><span className="text-muted">Type:</span> {reg.registration_type === 'fourball' ? '4-Ball' : 'Individual'}</div>
            </div>
          </div>

          {/* Payment */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Payment</h3>
            <div style={{ display: 'grid', gap: 10, fontSize: '0.9rem' }}>
              <div className="flex justify-between">
                <span className="text-muted">Amount Due</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--gold)' }}>R{Number(reg.amount_due).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Payment Status</span>
                <span className={`badge badge-${reg.payment_status}`}>{reg.payment_status}</span>
              </div>
            </div>
            {proofUrl && (
              <div style={{ marginTop: 16 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Proof of Payment</div>
                {proofUrl.match(/\.(jpg|jpeg|png|gif)/) ? (
                  <img src={proofUrl} alt="Proof" style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                ) : (
                  <a href={proofUrl} target="_blank" rel="noopener" className="btn btn-outline btn-sm btn-full">Open Proof Document ↗</a>
                )}
              </div>
            )}
            <div className="flex gap-2" style={{ marginTop: 16 }}>
              {reg.payment_status === 'uploaded' && (
                <>
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => updateField({ payment_status: 'verified', status: 'confirmed' })}>✓ Verify Payment</button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => updateField({ payment_status: 'rejected' })}>✗ Reject</button>
                </>
              )}
              {reg.payment_status === 'pending' && (
                <button className="btn btn-success btn-sm btn-full" onClick={() => updateField({ payment_status: 'verified', status: 'confirmed' })}>Mark as Paid & Confirm</button>
              )}
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: 16 }}>Players ({reg.players?.length || 0})</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Handicap</th>
                  <th>Shirt</th>
                  <th>Dietary</th>
                </tr>
              </thead>
              <tbody>
                {(reg.players || []).sort((a, b) => a.player_number - b.player_number).map(p => (
                  <tr key={p.id}>
                    <td>{p.player_number}</td>
                    <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                    <td className="text-muted">{p.email || '—'}</td>
                    <td className="text-muted">{p.phone || '—'}</td>
                    <td>{p.handicap || '—'}</td>
                    <td>{p.shirt_size || '—'}</td>
                    <td className="text-muted">{p.dietary_requirements || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Info */}
        {(reg.dietary_requirements || reg.special_requests) && (
          <div className="card mb-4">
            <h3 style={{ marginBottom: 16 }}>Additional Info</h3>
            {reg.dietary_requirements && <div style={{ marginBottom: 12 }}><span className="text-muted">Dietary:</span> {reg.dietary_requirements}</div>}
            {reg.special_requests && <div><span className="text-muted">Special Requests:</span> {reg.special_requests}</div>}
          </div>
        )}

        {/* Admin Notes */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: 16 }}>Admin Notes</h3>
          <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes about this registration..." />
          <button className="btn btn-outline btn-sm mt-3" onClick={saveNotes}>Save Notes</button>
        </div>

        {/* Status Actions */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Registration Status</h3>
          <div className="flex gap-2 flex-wrap">
            {reg.status !== 'confirmed' && <button className="btn btn-success" onClick={() => updateField({ status: 'confirmed' })}>Confirm Registration</button>}
            {reg.status !== 'pending' && <button className="btn btn-outline" onClick={() => updateField({ status: 'pending' })}>Set to Pending</button>}
            {reg.status !== 'cancelled' && <button className="btn btn-danger" onClick={() => updateField({ status: 'cancelled' })}>Cancel Registration</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
