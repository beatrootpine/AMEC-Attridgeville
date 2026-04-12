import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const defaults = {
  title: '', slug: '', description: '', event_date: '', event_time: '',
  venue: '', venue_address: '', banner_url: '', event_type: 'golf_day',
  registration_type: 'both', individual_price: '', fourball_price: '',
  max_capacity: '', registration_open: true, registration_close_date: '',
  banking_name: '', banking_bank: '', banking_account_no: '', banking_branch_code: '', banking_reference_note: '',
  custom_fields: [],
  payment_deadline: '',
  player_fields: [
    { id: 'full_name', label: 'Full Name', type: 'text', required: true, locked: true },
    { id: 'email', label: 'Email', type: 'email', required: false },
    { id: 'phone', label: 'Phone', type: 'tel', required: true },
    { id: 'handicap', label: 'Handicap', type: 'text', required: false },
    { id: 'shirt_size', label: 'Shirt Size', type: 'select', required: false, options: ['XS','S','M','L','XL','XXL','XXXL'] },
    { id: 'dietary_requirements', label: 'Dietary Requirements', type: 'text', required: false, placeholder: 'e.g. Halaal, Vegetarian' },
  ],
}

const fieldTypeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
]

function FieldBuilder({ fields, onChange, title, description }) {
  const add = () => onChange([...fields, {
    id: 'pf_' + Date.now(), label: '', type: 'text', required: false, options: [], placeholder: '',
  }])
  const update = (i, key, val) => { const u = [...fields]; u[i] = { ...u[i], [key]: val }; onChange(u) }
  const remove = (i) => onChange(fields.filter((_, idx) => idx !== i))
  const move = (i, dir) => {
    const u = [...fields]; const j = i + dir
    if (j < 0 || j >= u.length) return
    ;[u[i], u[j]] = [u[j], u[i]]; onChange(u)
  }

  return (
    <div className="form-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700 }}>{title}</div>
          <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>{description}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={add}>+ Add Field</button>
      </div>

      {fields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>No fields. Click "Add Field" to start.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {fields.map((f, i) => (
            <div key={f.id} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: f.locked ? 'rgba(89,26,74,0.03)' : 'var(--bg)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: f.locked ? 0 : 10 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', minWidth: 18 }}>#{i+1}</span>
                <input
                  className="form-input"
                  value={f.label}
                  onChange={e => update(i, 'label', e.target.value)}
                  placeholder="Field label"
                  disabled={f.locked}
                  style={{ flex: 1, padding: '7px 12px', fontSize: '0.85rem', opacity: f.locked ? 0.7 : 1 }}
                />
                <select
                  className="form-select"
                  value={f.type}
                  onChange={e => update(i, 'type', e.target.value)}
                  disabled={f.locked}
                  style={{ width: 120, padding: '7px 10px', fontSize: '0.8rem' }}
                >
                  {fieldTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={f.required} onChange={e => update(i, 'required', e.target.checked)} disabled={f.locked} style={{ accentColor: 'var(--purple)' }} />
                  Req
                </label>
                {!f.locked && (
                  <>
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="btn btn-outline btn-sm" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === fields.length - 1} className="btn btn-outline btn-sm" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>↓</button>
                    <button onClick={() => remove(i)} className="btn btn-danger btn-sm" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>✕</button>
                  </>
                )}
                {f.locked && <span style={{ fontSize: '0.65rem', color: 'var(--purple)', fontWeight: 600, whiteSpace: 'nowrap' }}>Required</span>}
              </div>
              {!f.locked && (f.type === 'text' || f.type === 'number' || f.type === 'email' || f.type === 'tel') && (
                <input className="form-input" value={f.placeholder || ''} onChange={e => update(i, 'placeholder', e.target.value)} placeholder="Placeholder text (optional)" style={{ padding: '6px 12px', fontSize: '0.8rem' }} />
              )}
              {!f.locked && f.type === 'select' && (
                <input className="form-input" value={(f.options || []).join(', ')} onChange={e => update(i, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Options (comma-separated)" style={{ padding: '6px 12px', fontSize: '0.8rem' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminEventForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [form, setForm] = useState({ ...defaults })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (isEdit) {
      supabase.from('events').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm({
          ...defaults, ...data,
          individual_price: data.individual_price || '',
          fourball_price: data.fourball_price || '',
          max_capacity: data.max_capacity || '',
          registration_close_date: data.registration_close_date || '',
          payment_deadline: data.payment_deadline || '',
          custom_fields: data.custom_fields || [],
          player_fields: (data.player_fields && data.player_fields.length > 0) ? data.player_fields : defaults.player_fields,
        })
        setFetching(false)
      })
    }
  }, [id])

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSave = async () => {
    if (!form.title || !form.event_date) return toast.error('Title and date are required')
    if (!form.slug) form.slug = autoSlug(form.title)

    const invalidPF = form.player_fields.filter(f => !f.label.trim())
    if (invalidPF.length) return toast.error('All player fields need a label')
    const invalidCF = form.custom_fields.filter(f => !f.label.trim())
    if (invalidCF.length) return toast.error('All custom fields need a label')

    setLoading(true)
    const payload = {
      title: form.title,
      slug: form.slug || autoSlug(form.title),
      description: form.description,
      event_date: form.event_date,
      event_time: form.event_time || null,
      venue: form.venue,
      venue_address: form.venue_address,
      banner_url: form.banner_url,
      event_type: form.event_type,
      registration_type: form.registration_type,
      individual_price: Number(form.individual_price) || 0,
      fourball_price: Number(form.fourball_price) || 0,
      max_capacity: Number(form.max_capacity) || null,
      registration_open: form.registration_open,
      registration_close_date: form.registration_close_date || null,
      banking_name: form.banking_name,
      banking_bank: form.banking_bank,
      banking_account_no: form.banking_account_no,
      banking_branch_code: form.banking_branch_code,
      banking_reference_note: form.banking_reference_note,
      custom_fields: form.custom_fields,
    }

    // Only include these if they have values (columns may not exist yet)
    if (form.player_fields && form.player_fields.length > 0) payload.player_fields = form.player_fields
    if (form.payment_deadline) payload.payment_deadline = form.payment_deadline

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('events').update(payload).eq('id', id))
    } else {
      ;({ error } = await supabase.from('events').insert(payload))
    }
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success(isEdit ? 'Event updated' : 'Event created')
    navigate('/admin')
  }

  if (fetching) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <Link to="/admin" className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to Dashboard</Link>
        <h1 style={{ marginTop: 12, marginBottom: 32 }}>{isEdit ? 'Edit Event' : 'Create Event'}</h1>

        {/* Event Details */}
        <div className="form-section">
          <div className="form-section-title">Event Details</div>
          <div className="form-group">
            <label className="form-label">Event Title *</label>
            <input className="form-input" value={form.title} onChange={e => { set('title', e.target.value); if (!isEdit) set('slug', autoSlug(e.target.value)) }} placeholder="e.g. Annual Fundraising Golf Day 2026" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">URL Slug</label>
              <input className="form-input" value={form.slug} onChange={e => set('slug', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <select className="form-select" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                <option value="golf_day">Golf Day</option>
                <option value="fundraiser">Fundraiser</option>
                <option value="conference">Conference</option>
                <option value="gala_dinner">Gala Dinner</option>
                <option value="church_event">Church Event</option>
                <option value="workshop">Workshop</option>
                <option value="social">Social Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: 120 }} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Event Date *</label>
              <input className="form-input" type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Event Time</label>
              <input className="form-input" type="time" value={form.event_time} onChange={e => set('event_time', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input className="form-input" value={form.venue} onChange={e => set('venue', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Venue Address</label>
              <input className="form-input" value={form.venue_address} onChange={e => set('venue_address', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Banner Image URL</label>
            <input className="form-input" value={form.banner_url} onChange={e => set('banner_url', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        {/* Registration & Pricing */}
        <div className="form-section">
          <div className="form-section-title">Registration & Pricing</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Registration Type</label>
              <select className="form-select" value={form.registration_type} onChange={e => set('registration_type', e.target.value)}>
                <option value="both">Individual & 4-Ball</option>
                <option value="individual">Individual Only</option>
                <option value="fourball">4-Ball Only</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Capacity</label>
              <input className="form-input" type="number" value={form.max_capacity} onChange={e => set('max_capacity', e.target.value)} placeholder="Unlimited" />
            </div>
          </div>
          <div className="grid-2">
            {(form.registration_type === 'individual' || form.registration_type === 'both') && (
              <div className="form-group">
                <label className="form-label">Individual Price (R)</label>
                <input className="form-input" type="number" value={form.individual_price} onChange={e => set('individual_price', e.target.value)} />
              </div>
            )}
            {(form.registration_type === 'fourball' || form.registration_type === 'both') && (
              <div className="form-group">
                <label className="form-label">4-Ball Price (R)</label>
                <input className="form-input" type="number" value={form.fourball_price} onChange={e => set('fourball_price', e.target.value)} />
              </div>
            )}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Registration Close Date</label>
              <input className="form-input" type="date" value={form.registration_close_date} onChange={e => set('registration_close_date', e.target.value)} />
              <div className="form-hint">Leave blank for no deadline</div>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Deadline</label>
              <input className="form-input" type="date" value={form.payment_deadline} onChange={e => set('payment_deadline', e.target.value)} />
              <div className="form-hint">Shown to registrants on the payment section</div>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.registration_open} onChange={e => set('registration_open', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--purple)' }} />
                <span style={{ fontSize: '0.9rem' }}>Registration is open</span>
              </label>
            </div>
          </div>
        </div>

        {/* Banking */}
        <div className="form-section">
          <div className="form-section-title">Banking Details</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input className="form-input" value={form.banking_name} onChange={e => set('banking_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bank</label>
              <input className="form-input" value={form.banking_bank} onChange={e => set('banking_bank', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input className="form-input" value={form.banking_account_no} onChange={e => set('banking_account_no', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Branch Code</label>
              <input className="form-input" value={form.banking_branch_code} onChange={e => set('banking_branch_code', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Reference Note</label>
            <input className="form-input" value={form.banking_reference_note} onChange={e => set('banking_reference_note', e.target.value)} placeholder="e.g. 4-Ball: Team Name / Individual: Name & Surname" />
          </div>
        </div>

        {/* Player Form Fields */}
        <FieldBuilder
          fields={form.player_fields}
          onChange={v => set('player_fields', v)}
          title="Player Form Fields"
          description="Configure which fields appear per player on the registration form. 'Full Name' is always required."
        />

        {/* Custom Registration Fields */}
        <FieldBuilder
          fields={form.custom_fields}
          onChange={v => set('custom_fields', v)}
          title="Extra Registration Fields"
          description="Additional questions shown once per registration (not per player)"
        />

        <div className="flex gap-3">
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
          </button>
          <Link to="/admin" className="btn btn-outline btn-lg" style={{ textDecoration: 'none' }}>Cancel</Link>
        </div>
      </div>
    </div>
  )
}
