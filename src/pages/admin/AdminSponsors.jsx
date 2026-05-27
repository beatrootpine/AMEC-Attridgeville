import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authClient as supabase } from '../../lib/supabase'
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
  const [showAddSponsorReg, setShowAddSponsorReg] = useState(false)
  const [addingSponsorReg, setAddingSponsorReg] = useState(false)
  const [newSponsor, setNewSponsor] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', package_id: '' })
  const [editReg, setEditReg] = useState(null)
  const [savingReg, setSavingReg] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailFilter, setEmailFilter] = useState('all')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingReminders, setSendingReminders] = useState(false)

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

  const getEmailRecipients = () => {
    let list = regs
    if (emailFilter === 'confirmed') list = list.filter(r => r.status === 'confirmed')
    if (emailFilter === 'pending') list = list.filter(r => r.status === 'pending')
    if (emailFilter === 'unpaid') list = list.filter(r => r.payment_status === 'pending')
    return [...new Set(list.map(r => r.contact_email).filter(Boolean))]
  }

  const sendBulkEmail = async () => {
    const recipients = getEmailRecipients()
    if (recipients.length === 0) return toast.error('No recipients match this filter')
    if (!emailSubject.trim()) return toast.error('Please enter a subject')
    if (!emailBody.trim()) return toast.error('Please enter a message')
    if (!window.confirm(`Send email to ${recipients.length} sponsor${recipients.length !== 1 ? 's' : ''}?`)) return
    setSendingEmail(true)
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sendgrid-broadcast`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject: emailSubject, body: emailBody, event_title: event?.title }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(`Sent to ${data.sent} of ${data.total} sponsors!`)
      setShowEmail(false)
      setEmailSubject('')
      setEmailBody('')
    } catch (err) {
      toast.error(err.message || 'Failed to send')
    } finally { setSendingEmail(false) }
  }

  const sendPaymentReminders = async () => {
    const unpaid = regs.filter(r => r.payment_status === 'pending' || r.payment_status === 'uploaded')
    if (unpaid.length === 0) return toast.error('No unpaid sponsors to remind')
    if (!window.confirm(`Send payment reminders to ${unpaid.length} unpaid sponsor${unpaid.length !== 1 ? 's' : ''}?`)) return
    setSendingReminders(true)
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-bulk-reminder`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(`Sent ${data.sent} payment reminder${data.sent !== 1 ? 's' : ''}!`)
    } catch (err) {
      toast.error(err.message || 'Failed to send reminders')
    } finally { setSendingReminders(false) }
  }

  const handleSaveReg = async () => {
    if (!editReg.contact_name || !editReg.contact_email) return toast.error('Name and email are required')
    setSavingReg(true)
    const { error } = await supabase.from('sponsor_registrations').update({
      company_name: editReg.company_name,
      contact_name: editReg.contact_name,
      contact_email: editReg.contact_email,
      contact_phone: editReg.contact_phone,
      package_id: editReg.package_id,
      amount_due: editReg.amount_due,
    }).eq('id', editReg.id)
    setSavingReg(false)
    if (error) return toast.error(error.message)
    toast.success('Sponsor entry updated')
    setEditReg(null)
    loadData()
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleAddSponsorReg = async () => {
    if (!newSponsor.contact_name || !newSponsor.contact_email || !newSponsor.package_id) return toast.error('Name, email and package are required')
    setAddingSponsorReg(true)
    try {
      const pkg = packages.find(p => p.id === newSponsor.package_id)
      if (!pkg) throw new Error('Package not found')

      const { data: sr, error: srErr } = await supabase.from('sponsor_registrations').insert({
        event_id: eventId,
        package_id: pkg.id,
        company_name: newSponsor.company_name,
        contact_name: newSponsor.contact_name,
        contact_email: newSponsor.contact_email.trim().toLowerCase(),
        contact_phone: newSponsor.contact_phone,
        amount_due: pkg.price,
        status: 'pending',
        payment_status: 'pending',
      }).select().single()
      if (srErr) throw srErr

      // Generate invoice — store against a registration if fourball included, else create standalone record via notes
      // For sponsors we store invoice linked via notes field since sponsor_registrations != registrations
      // We insert into invoices with a null registration_id and note the sponsor reg id
      await supabase.from('invoices').insert({
        registration_id: null,
        amount_due: pkg.price,
        status: 'unpaid',
        notes: 'sponsor:' + sr.id + ':' + newSponsor.company_name + ':' + newSponsor.contact_email,
      })

      toast.success('Sponsor added & invoice created!')
      setShowAddSponsorReg(false)
      setNewSponsor({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', package_id: '' })
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to add sponsor')
    } finally { setAddingSponsorReg(false) }
  }

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2>Sponsor Enquiries ({regs.length})</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className='btn btn-outline btn-sm' onClick={sendPaymentReminders} disabled={sendingReminders}>
              {sendingReminders ? 'Sending...' : '💳 Payment Reminders'}
            </button>
            <button className='btn btn-outline btn-sm' onClick={() => setShowEmail(true)}>✉️ Email Sponsors</button>
            <button className='btn btn-outline btn-sm' onClick={() => setShowAddSponsorReg(true)}>+ Add Sponsor</button>
          </div>
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
                        <button className="btn btn-outline btn-sm" onClick={() => setEditReg({ ...r, amount_due: r.amount_due })}>Edit</button>
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

        {/* Email Sponsors Modal */}
        {showEmail && (
          <div className='modal-overlay' onClick={() => setShowEmail(false)}>
            <div className='modal' onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>Email Sponsors</h2>
                <button onClick={() => setShowEmail(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className='form-group'>
                <label className='form-label'>Send To</label>
                <select className='form-select' value={emailFilter} onChange={e => setEmailFilter(e.target.value)}>
                  <option value='all'>All Sponsors ({regs.length})</option>
                  <option value='confirmed'>Confirmed only ({regs.filter(r => r.status === 'confirmed').length})</option>
                  <option value='pending'>Pending only ({regs.filter(r => r.status === 'pending').length})</option>
                  <option value='unpaid'>Unpaid only ({regs.filter(r => r.payment_status === 'pending').length})</option>
                </select>
              </div>
              <div className='form-group'>
                <label className='form-label'>Subject</label>
                <input className='form-input' value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder='e.g. Important update — Golf Day 31 July 2026' />
              </div>
              <div className='form-group'>
                <label className='form-label'>Message</label>
                <textarea className='form-input' rows={6} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder='Write your message here...' style={{ resize: 'vertical' }} />
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(89,26,74,0.06)', borderRadius: 8, fontSize: '0.82rem', marginBottom: 16 }}>
                📨 Will send to <strong>{getEmailRecipients().length}</strong> sponsor{getEmailRecipients().length !== 1 ? 's' : ''} with church email branding
              </div>
              <button className='btn btn-primary' style={{ width: '100%' }} onClick={sendBulkEmail} disabled={sendingEmail}>
                {sendingEmail ? 'Sending...' : `Send to ${getEmailRecipients().length} Sponsor${getEmailRecipients().length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Edit Sponsor Registration Modal */}
        {editReg && (
          <div className='modal-overlay' onClick={() => setEditReg(null)}>
            <div className='modal' onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>Edit Sponsor Entry</h2>
                <button onClick={() => setEditReg(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className='form-group'>
                <label className='form-label'>Sponsorship Package</label>
                <select className='form-select' value={editReg.package_id} onChange={e => {
                  const pkg = packages.find(p => p.id === e.target.value)
                  setEditReg(r => ({ ...r, package_id: e.target.value, amount_due: pkg ? pkg.price : r.amount_due }))
                }}>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name} — R{Number(pkg.price).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div className='form-group'>
                <label className='form-label'>Amount Due (R)</label>
                <input className='form-input' type='number' value={editReg.amount_due} onChange={e => setEditReg(r => ({ ...r, amount_due: e.target.value }))} />
                <div className='form-hint'>Override the package price if needed (e.g. negotiated rate)</div>
              </div>
              <div className='form-group'>
                <label className='form-label'>Company Name</label>
                <input className='form-input' value={editReg.company_name || ''} onChange={e => setEditReg(r => ({ ...r, company_name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className='form-group'>
                  <label className='form-label'>Contact Name *</label>
                  <input className='form-input' value={editReg.contact_name || ''} onChange={e => setEditReg(r => ({ ...r, contact_name: e.target.value }))} />
                </div>
                <div className='form-group'>
                  <label className='form-label'>Phone</label>
                  <input className='form-input' value={editReg.contact_phone || ''} onChange={e => setEditReg(r => ({ ...r, contact_phone: e.target.value }))} />
                </div>
              </div>
              <div className='form-group'>
                <label className='form-label'>Email *</label>
                <input className='form-input' type='email' value={editReg.contact_email || ''} onChange={e => setEditReg(r => ({ ...r, contact_email: e.target.value }))} />
              </div>
              <button className='btn btn-primary' style={{ width: '100%' }} onClick={handleSaveReg} disabled={savingReg}>
                {savingReg ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Add Sponsor Registration Modal */}
        {showAddSponsorReg && (
          <div className='modal-overlay' onClick={() => setShowAddSponsorReg(false)}>
            <div className='modal' onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>Add Sponsor</h2>
                <button onClick={() => setShowAddSponsorReg(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className='form-group'>
                <label className='form-label'>Sponsorship Package *</label>
                <select className='form-select' value={newSponsor.package_id} onChange={e => setNewSponsor(p => ({ ...p, package_id: e.target.value }))}>
                  <option value=''>Select package...</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name} — R{Number(pkg.price).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div className='form-group'>
                <label className='form-label'>Company Name</label>
                <input className='form-input' value={newSponsor.company_name} onChange={e => setNewSponsor(p => ({ ...p, company_name: e.target.value }))} placeholder='Company / Organisation' />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className='form-group'>
                  <label className='form-label'>Contact Name *</label>
                  <input className='form-input' value={newSponsor.contact_name} onChange={e => setNewSponsor(p => ({ ...p, contact_name: e.target.value }))} />
                </div>
                <div className='form-group'>
                  <label className='form-label'>Phone</label>
                  <input className='form-input' type='tel' value={newSponsor.contact_phone} onChange={e => setNewSponsor(p => ({ ...p, contact_phone: e.target.value }))} />
                </div>
              </div>
              <div className='form-group'>
                <label className='form-label'>Email *</label>
                <input className='form-input' type='email' value={newSponsor.contact_email} onChange={e => setNewSponsor(p => ({ ...p, contact_email: e.target.value }))} />
              </div>
              {newSponsor.package_id && (
                <div style={{ padding: '10px 14px', background: 'rgba(74,32,128,0.06)', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
                  💰 Invoice will be auto-generated for <strong>R{Number(packages.find(p => p.id === newSponsor.package_id)?.price || 0).toLocaleString()}</strong>
                </div>
              )}
              <button className='btn btn-primary' style={{ width: '100%' }} onClick={handleAddSponsorReg} disabled={addingSponsorReg}>
                {addingSponsorReg ? 'Adding...' : 'Add Sponsor & Generate Invoice'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
