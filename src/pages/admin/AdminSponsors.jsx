import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const tierConfig = {
  title: { emoji: '🏆', color: '#b8860b' },
  platinum: { emoji: '🥇', color: '#6b3fa0' },
  gold: { emoji: '🥈', color: '#d4a832' },
  silver: { emoji: '🥉', color: '#888' },
  prize: { emoji: '🎁', color: '#16a34a' },
  custom: { emoji: '⭐', color: '#591a4a' },
}

const emptyPkg = {
  name: '', tier: 'gold', price: '', benefits: [],
  includes_fourball: false, fourball_count: 0, max_available: '', sort_order: 0,
}

export default function AdminSponsors() {
  const { id: eventId } = useParams()
  const [packages, setPackages] = useState([])
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ ...emptyPkg })
  const [benefitText, setBenefitText] = useState('')
  const [saving, setSaving] = useState(false)
  const [event, setEvent] = useState(null)

  useEffect(() => { loadData() }, [eventId])

  const loadData = async () => {
    const { data: ev } = await supabase.from('events').select('title').eq('id', eventId).single()
    const { data: pkgs } = await supabase.from('sponsor_packages').select('*').eq('event_id', eventId).order('sort_order')
    const { data: rs } = await supabase.from('sponsor_registrations').select('*, sponsor_packages(name, tier)').eq('event_id', eventId).order('created_at', { ascending: false })
    setEvent(ev)
    setPackages(pkgs || [])
    setRegs(rs || [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyPkg, sort_order: packages.length })
    setBenefitText('')
    setShowForm(true)
  }

  const openEdit = (pkg) => {
    setEditId(pkg.id)
    setForm({ ...pkg, price: pkg.price || '', max_available: pkg.max_available || '' })
    setBenefitText((pkg.benefits || []).join('\n'))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.price) return toast.error('Name and price are required')
    setSaving(true)
    const payload = {
      ...form, event_id: eventId,
      price: Number(form.price),
      max_available: Number(form.max_available) || null,
      fourball_count: form.includes_fourball ? Number(form.fourball_count) || 1 : 0,
      benefits: benefitText.split('\n').map(b => b.trim()).filter(Boolean),
    }
    delete payload.id; delete payload.created_at

    let error
    if (editId) {
      ;({ error } = await supabase.from('sponsor_packages').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('sponsor_packages').insert(payload))
    }
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editId ? 'Package updated' : 'Package created')
    setShowForm(false)
    loadData()
  }

  const deletePkg = async (pkgId) => {
    if (!window.confirm('Delete this package?')) return
    await supabase.from('sponsor_packages').delete().eq('id', pkgId)
    toast.success('Deleted')
    loadData()
  }

  const updateRegStatus = async (regId, updates) => {
    await supabase.from('sponsor_registrations').update(updates).eq('id', regId)
    toast.success('Updated')
    loadData()
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <Link to={`/admin/events/${eventId}`} className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to {event?.title}</Link>
        <div className="flex justify-between items-center" style={{ marginTop: 12, marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1>Sponsorship Packages</h1>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Package</button>
        </div>

        {/* Packages */}
        {packages.length === 0 && !showForm ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <p style={{ marginBottom: 8, fontWeight: 500 }}>No packages yet</p>
            <p className="text-muted" style={{ marginBottom: 20 }}>Create sponsorship tiers for this event</p>
            <button className="btn btn-primary" onClick={openAdd}>Create First Package</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
            {packages.map(pkg => {
              const tc = tierConfig[pkg.tier] || tierConfig.custom
              const regCount = regs.filter(r => r.package_id === pkg.id && r.status !== 'cancelled').length
              return (
                <div key={pkg.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.2rem' }}>{tc.emoji}</span>
                      <h3 style={{ margin: 0 }}>{pkg.name}</h3>
                      <span style={{ fontWeight: 700, color: tc.color, fontSize: '1.1rem' }}>R{Number(pkg.price).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {pkg.includes_fourball && <span>🏌️ {pkg.fourball_count} x 4-ball included</span>}
                      <span>{regCount} sponsor{regCount !== 1 ? 's' : ''} registered</span>
                      {pkg.max_available && <span>Max: {pkg.max_available}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(pkg)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deletePkg(pkg.id)}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>{editId ? 'Edit Package' : 'New Package'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Package Name *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Title Sponsor" />
              </div>
              <div className="form-group">
                <label className="form-label">Tier</label>
                <select className="form-select" value={form.tier} onChange={e => set('tier', e.target.value)}>
                  <option value="title">🏆 Title</option>
                  <option value="platinum">🥇 Platinum</option>
                  <option value="gold">🥈 Gold</option>
                  <option value="silver">🥉 Silver / Hole</option>
                  <option value="prize">🎁 Prize</option>
                  <option value="custom">⭐ Custom</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Price (R) *</label>
                <input className="form-input" type="number" value={form.price} onChange={e => set('price', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Available</label>
                <input className="form-input" type="number" value={form.max_available} onChange={e => set('max_available', e.target.value)} placeholder="Unlimited" />
              </div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                <input type="checkbox" checked={form.includes_fourball} onChange={e => set('includes_fourball', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--purple)' }} />
                <span style={{ fontSize: '0.9rem' }}>Includes complimentary 4-ball team(s)</span>
              </label>
              {form.includes_fourball && (
                <div style={{ maxWidth: 200 }}>
                  <label className="form-label">Number of 4-ball teams</label>
                  <input className="form-input" type="number" value={form.fourball_count} onChange={e => set('fourball_count', e.target.value)} min="1" />
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Benefits (one per line)</label>
              <textarea className="form-textarea" value={benefitText} onChange={e => setBenefitText(e.target.value)} placeholder={"Logo on ALL marketing material\nBanner display at registration\n2 x complimentary 4-ball teams"} style={{ minHeight: 160 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Display Order</label>
              <input className="form-input" type="number" value={form.sort_order} onChange={e => set('sort_order', Number(e.target.value))} style={{ maxWidth: 100 }} />
              <div className="form-hint">Lower numbers appear first</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Package' : 'Create Package'}</button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Sponsor Registrations */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Sponsor Enquiries ({regs.length})</h2>
        </div>
        {regs.length === 0 ? (
          <div className="card text-center" style={{ padding: 32, color: 'var(--text-muted)' }}>No sponsor registrations yet.</div>
        ) : (
          <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr><th>Company</th><th>Contact</th><th>Package</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {regs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.company_name}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{r.contact_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{r.contact_email}</div>
                    </td>
                    <td>{r.sponsor_packages?.name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>R{Number(r.amount_due).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${r.status}`}>{r.status}</span>
                      <span className={`badge badge-${r.payment_status}`} style={{ marginLeft: 4 }}>{r.payment_status}</span>
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {r.status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => updateRegStatus(r.id, { status: 'confirmed' })}>Confirm</button>}
                        {r.payment_status === 'uploaded' && (
                          <button className="btn btn-success btn-sm" onClick={() => updateRegStatus(r.id, { payment_status: 'verified', status: 'confirmed' })}>Verify Pay</button>
                        )}
                        {r.status !== 'cancelled' && <button className="btn btn-danger btn-sm" onClick={() => updateRegStatus(r.id, { status: 'cancelled' })}>Cancel</button>}
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
