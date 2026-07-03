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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [editingPlayers, setEditingPlayers] = useState(false)
  const [players, setPlayers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [regId])

  const loadData = async () => {
    const { data } = await supabase.from('registrations').select('*, players(*), events(title)').eq('id', regId).single()
    setReg(data)
    setNotes(data?.admin_notes || '')
    setForm({
      contact_name: data?.contact_name || '',
      contact_email: data?.contact_email || '',
      contact_phone: data?.contact_phone || '',
      company: data?.company || '',
      team_name: data?.team_name || '',
      amount_due: data?.amount_due || 0,
      registration_type: data?.registration_type || 'individual',
      special_requests: data?.special_requests || '',
    })
    setPlayers((data?.players || []).sort((a, b) => a.player_number - b.player_number).map(p => ({ ...p })))
    if (data?.payment_proof_url) {
      const { data: urlData } = await supabase.storage.from('payment-proofs').createSignedUrl(data.payment_proof_url, 3600)
      setProofUrl(urlData?.signedUrl)
    }
    setLoading(false)
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const saveDetails = async () => {
    setSaving(true)
    const { error } = await supabase.from('registrations').update({
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      company: form.company,
      team_name: form.team_name,
      amount_due: Number(form.amount_due),
      special_requests: form.special_requests,
    }).eq('id', regId)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Registration updated')
    setEditing(false)
    loadData()
  }

  const savePlayers = async () => {
    setSaving(true)
    for (const p of players) {
      const { error } = await supabase.from('players').update({
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        handicap: p.handicap,
        shirt_size: p.shirt_size,
        dietary_requirements: p.dietary_requirements,
      }).eq('id', p.id)
      if (error) { toast.error(error.message); setSaving(false); return }
    }
    setSaving(false)
    toast.success('Players updated')
    setEditingPlayers(false)
    loadData()
  }

  const updatePlayer = (i, field, value) => {
    const u = [...players]; u[i] = { ...u[i], [field]: value }; setPlayers(u)
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
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Contact Details</h3>
              {!editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>}
            </div>
            {editing ? (
              <>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" value={form.company} onChange={e => set('company', e.target.value)} />
                </div>
                {form.registration_type === 'fourball' && (
                  <div className="form-group">
                    <label className="form-label">Team Name</label>
                    <input className="form-input" value={form.team_name} onChange={e => set('team_name', e.target.value)} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Amount Due (R)</label>
                  <input className="form-input" type="number" value={form.amount_due} onChange={e => set('amount_due', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Special Requests</label>
                  <textarea className="form-textarea" value={form.special_requests} onChange={e => set('special_requests', e.target.value)} style={{ minHeight: 60 }} />
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={saveDetails} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gap: 10, fontSize: '0.9rem' }}>
                <div><span className="text-muted">Name:</span> {reg.contact_name}</div>
                <div><span className="text-muted">Email:</span> <a href={`mailto:${reg.contact_email}`}>{reg.contact_email}</a></div>
                <div><span className="text-muted">Phone:</span> <a href={`tel:${reg.contact_phone}`}>{reg.contact_phone}</a></div>
                {reg.company && <div><span className="text-muted">Company:</span> {reg.company}</div>}
                {reg.team_name && <div><span className="text-muted">Team:</span> {reg.team_name}</div>}
                <div><span className="text-muted">Type:</span> {reg.registration_type === 'fourball' ? '4-Ball' : 'Individual'}</div>
                <div><span className="text-muted">Amount:</span> <strong>R{Number(reg.amount_due).toLocaleString()}</strong></div>
                {reg.special_requests && <div><span className="text-muted">Requests:</span> {reg.special_requests}</div>}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Payment</h3>
            <div style={{ display: 'grid', gap: 10, fontSize: '0.9rem' }}>
              <div className="flex justify-between">
                <span className="text-muted">Amount Due</span>
                <span style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--gold)' }}>R{Number(reg.amount_due).toLocaleString()}</span>
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
                  <a href={proofUrl} target="_blank" rel="noopener" className="btn btn-outline btn-sm btn-full">Open Proof ↗</a>
                )}
              </div>
            )}
            <div className="flex gap-2" style={{ marginTop: 16 }}>
              {reg.payment_status === 'uploaded' && (
                <>
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => updateField({ payment_status: 'verified', status: 'confirmed' })}>✓ Verify</button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => updateField({ payment_status: 'rejected' })}>✗ Reject</button>
                </>
              )}
              {reg.payment_status === 'pending' && (
                <button className="btn btn-success btn-sm btn-full" onClick={() => updateField({ payment_status: 'verified', status: 'confirmed' })}>Mark as Paid</button>
              )}
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="card mb-4">
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Players ({players.length})</h3>
            {!editingPlayers && <button className="btn btn-outline btn-sm" onClick={() => setEditingPlayers(true)}>✏️ Edit Players</button>}
          </div>
          {editingPlayers ? (
            <>
              {players.map((p, i) => (
                <div key={p.id} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Player {p.player_number}</div>
                  <div className="grid-2" style={{ gap: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Name</label>
                      <input className="form-input" value={p.full_name} onChange={e => updatePlayer(i, 'full_name', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Email</label>
                      <input className="form-input" value={p.email || ''} onChange={e => updatePlayer(i, 'email', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Phone</label>
                      <input className="form-input" value={p.phone || ''} onChange={e => updatePlayer(i, 'phone', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Handicap</label>
                      <input className="form-input" value={p.handicap || ''} onChange={e => updatePlayer(i, 'handicap', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Shirt Size</label>
                      <input className="form-input" value={p.shirt_size || ''} onChange={e => updatePlayer(i, 'shirt_size', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Dietary</label>
                      <input className="form-input" value={p.dietary_requirements || ''} onChange={e => updatePlayer(i, 'dietary_requirements', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={savePlayers} disabled={saving}>{saving ? 'Saving...' : 'Save Players'}</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditingPlayers(false); loadData() }}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Handicap</th><th>Shirt</th><th>Dietary</th></tr>
                </thead>
                <tbody>
                  {players.map(p => (
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
          )}
        </div>

        {/* Admin Notes */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: 16 }}>Admin Notes</h3>
          <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
          <button className="btn btn-outline btn-sm mt-3" onClick={saveNotes}>Save Notes</button>
        </div>

        {/* Status Actions */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Registration Status</h3>
          <div className="flex gap-2 flex-wrap">
            {reg.status !== 'confirmed' && <button className="btn btn-success" onClick={() => updateField({ status: 'confirmed' })}>Confirm</button>}
            {reg.status !== 'pending' && <button className="btn btn-outline" onClick={() => updateField({ status: 'pending' })}>Set Pending</button>}
            {reg.status !== 'cancelled' && <button className="btn btn-danger" onClick={() => updateField({ status: 'cancelled' })}>Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
