import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const defaults = {
  title: '', slug: '', description: '', event_date: '', event_time: '',
  venue: '', venue_address: '', banner_url: '', event_type: 'golf_day',
  registration_type: 'both', individual_price: '', fourball_price: '',
  max_capacity: '', registration_open: true,
  banking_name: '', banking_bank: '', banking_account_no: '', banking_branch_code: '', banking_reference_note: '',
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
        if (data) setForm({ ...defaults, ...data, individual_price: data.individual_price || '', fourball_price: data.fourball_price || '', max_capacity: data.max_capacity || '' })
        setFetching(false)
      })
    }
  }, [id])

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSave = async () => {
    if (!form.title || !form.event_date) return toast.error('Title and date are required')
    if (!form.slug) form.slug = autoSlug(form.title)

    setLoading(true)
    const payload = {
      ...form,
      individual_price: Number(form.individual_price) || 0,
      fourball_price: Number(form.fourball_price) || 0,
      max_capacity: Number(form.max_capacity) || null,
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
      <div className="container" style={{ maxWidth: 720 }}>
        <Link to="/admin" className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to Dashboard</Link>
        <h1 style={{ marginTop: 12, marginBottom: 32 }}>{isEdit ? 'Edit Event' : 'Create Event'}</h1>

        <div className="form-section">
          <div className="form-section-title">Event Details</div>
          <div className="form-group">
            <label className="form-label">Event Title *</label>
            <input className="form-input" value={form.title} onChange={e => { set('title', e.target.value); if (!isEdit) set('slug', autoSlug(e.target.value)) }} placeholder="e.g. Annual Church Golf Day 2026" />
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
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" type="time" value={form.event_time} onChange={e => set('event_time', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input className="form-input" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. Centurion Golf Estate" />
            </div>
            <div className="form-group">
              <label className="form-label">Venue Address</label>
              <input className="form-input" value={form.venue_address} onChange={e => set('venue_address', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Banner Image URL</label>
            <input className="form-input" value={form.banner_url} onChange={e => set('banner_url', e.target.value)} placeholder="https://..." />
            <div className="form-hint">Direct link to an image. You can upload to Supabase Storage and paste the public URL.</div>
          </div>
        </div>

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
              <input className="form-input" type="number" value={form.max_capacity} onChange={e => set('max_capacity', e.target.value)} placeholder="Leave empty for unlimited" />
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
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.registration_open} onChange={e => set('registration_open', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
              <span style={{ fontSize: '0.9rem' }}>Registration is open</span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Banking Details (shown to registrants)</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input className="form-input" value={form.banking_name} onChange={e => set('banking_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bank</label>
              <input className="form-input" value={form.banking_bank} onChange={e => set('banking_bank', e.target.value)} placeholder="e.g. FNB, Nedbank" />
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

        <div className="flex gap-3">
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
          </button>
          <Link to="/admin" className="btn btn-outline btn-lg">Cancel</Link>
        </div>
      </div>
    </div>
  )
}
