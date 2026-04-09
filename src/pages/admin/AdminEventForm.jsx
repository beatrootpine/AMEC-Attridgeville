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
}

const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'number', label: 'Number' },
]

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
          custom_fields: data.custom_fields || [],
        })
        setFetching(false)
      })
    }
  }, [id])

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  // Custom field management
  const addField = () => {
    set('custom_fields', [...form.custom_fields, {
      id: 'cf_' + Date.now(),
      label: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
    }])
  }

  const updateField = (index, key, value) => {
    const updated = [...form.custom_fields]
    updated[index] = { ...updated[index], [key]: value }
    set('custom_fields', updated)
  }

  const removeField = (index) => {
    set('custom_fields', form.custom_fields.filter((_, i) => i !== index))
  }

  const moveField = (index, dir) => {
    const updated = [...form.custom_fields]
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= updated.length) return
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    set('custom_fields', updated)
  }

  const handleSave = async () => {
    if (!form.title || !form.event_date) return toast.error('Title and date are required')
    if (!form.slug) form.slug = autoSlug(form.title)

    // Validate custom fields
    const invalidFields = form.custom_fields.filter(f => !f.label.trim())
    if (invalidFields.length > 0) return toast.error('All custom fields need a label')

    setLoading(true)
    const payload = {
      ...form,
      individual_price: Number(form.individual_price) || 0,
      fourball_price: Number(form.fourball_price) || 0,
      max_capacity: Number(form.max_capacity) || null,
      registration_close_date: form.registration_close_date || null,
      custom_fields: form.custom_fields,
    }

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
              <input className="form-input" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="auto-generated" />
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
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the event..." style={{ minHeight: 120 }} />
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
              <input className="form-input" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. Centurion Golf Club" />
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
                <input className="form-input" type="number" value={form.individual_price} onChange={e => set('individual_price', e.target.value)} placeholder="0" />
              </div>
            )}
            {(form.registration_type === 'fourball' || form.registration_type === 'both') && (
              <div className="form-group">
                <label className="form-label">4-Ball Price (R)</label>
                <input className="form-input" type="number" value={form.fourball_price} onChange={e => set('fourball_price', e.target.value)} placeholder="0" />
              </div>
            )}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Registration Close Date</label>
              <input className="form-input" type="date" value={form.registration_close_date} onChange={e => set('registration_close_date', e.target.value)} />
              <div className="form-hint">Leave blank for no deadline. Registration will auto-close after this date.</div>
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
              <input className="form-input" value={form.banking_bank} onChange={e => set('banking_bank', e.target.value)} placeholder="e.g. FNB" />
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
            <input className="form-input" value={form.banking_reference_note} onChange={e => set('banking_reference_note', e.target.value)} placeholder="e.g. Use your surname + GOLF as reference" />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700 }}>Custom Registration Fields</div>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>Add extra questions to the registration form</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={addField}>+ Add Field</button>
          </div>

          {form.custom_fields.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No custom fields added. Click "Add Field" to add questions like dietary preferences, company name, t-shirt size, etc.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {form.custom_fields.map((field, i) => (
                <div key={field.id} style={{
                  padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  background: 'var(--bg)',
                }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', minWidth: 20 }}>#{i + 1}</span>
                    <input
                      className="form-input"
                      value={field.label}
                      onChange={e => updateField(i, 'label', e.target.value)}
                      placeholder="Field label (e.g. Dietary Requirements)"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                    <select
                      className="form-select"
                      value={field.type}
                      onChange={e => updateField(i, 'type', e.target.value)}
                      style={{ width: 140, padding: '8px 12px', fontSize: '0.82rem' }}
                    >
                      {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {field.type === 'text' || field.type === 'number' ? (
                      <input
                        className="form-input"
                        value={field.placeholder || ''}
                        onChange={e => updateField(i, 'placeholder', e.target.value)}
                        placeholder="Placeholder text (optional)"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
                      />
                    ) : field.type === 'select' ? (
                      <input
                        className="form-input"
                        value={(field.options || []).join(', ')}
                        onChange={e => updateField(i, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="Options (comma-separated, e.g. Halaal, Vegetarian, None)"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
                      />
                    ) : null}

                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={field.required} onChange={e => updateField(i, 'required', e.target.checked)} style={{ accentColor: 'var(--purple)' }} />
                      Required
                    </label>
                    <button onClick={() => moveField(i, -1)} disabled={i === 0} className="btn btn-outline btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>↑</button>
                    <button onClick={() => moveField(i, 1)} disabled={i === form.custom_fields.length - 1} className="btn btn-outline btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>↓</button>
                    <button onClick={() => removeField(i)} className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
