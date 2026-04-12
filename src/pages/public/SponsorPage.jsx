import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const tierConfig = {
  title: { emoji: '🏆', color: '#b8860b', bg: 'linear-gradient(135deg, rgba(184,134,11,0.08), rgba(184,134,11,0.02))' },
  platinum: { emoji: '🥇', color: '#591a4a', bg: 'linear-gradient(135deg, rgba(89,26,74,0.06), rgba(89,26,74,0.02))' },
  gold: { emoji: '🥈', color: '#d4a832', bg: 'linear-gradient(135deg, rgba(212,168,50,0.06), rgba(212,168,50,0.02))' },
  silver: { emoji: '🥉', color: '#666', bg: 'linear-gradient(135deg, rgba(100,100,100,0.06), rgba(100,100,100,0.02))' },
  prize: { emoji: '🎁', color: '#16a34a', bg: 'linear-gradient(135deg, rgba(22,163,74,0.06), rgba(22,163,74,0.02))' },
  custom: { emoji: '⭐', color: '#591a4a', bg: 'var(--bg)' },
}

export default function SponsorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', message: '' })
  const [teams, setTeams] = useState([])
  const [paymentFile, setPaymentFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', slug).single().then(async ({ data: ev }) => {
      setEvent(ev)
      if (ev) {
        const { data: pkgs } = await supabase.from('sponsor_packages').select('*').eq('event_id', ev.id).order('sort_order')
        setPackages(pkgs || [])
      }
      setLoading(false)
    })
  }, [slug])

  // When package changes, build team slots
  useEffect(() => {
    if (!selectedPkg?.includes_fourball || !selectedPkg.fourball_count) {
      setTeams([])
      return
    }
    const groupSize = event?.fourball_size || 4
    const newTeams = []
    for (let t = 0; t < selectedPkg.fourball_count; t++) {
      const players = []
      for (let p = 0; p < groupSize; p++) {
        players.push({ full_name: '', email: '', phone: '' })
      }
      newTeams.push({ team_name: '', players })
    }
    setTeams(newTeams)
  }, [selectedPkg, event])

  const updateTeamName = (ti, val) => {
    const u = [...teams]; u[ti] = { ...u[ti], team_name: val }; setTeams(u)
  }
  const updatePlayer = (ti, pi, field, val) => {
    const u = [...teams]
    u[ti] = { ...u[ti], players: [...u[ti].players] }
    u[ti].players[pi] = { ...u[ti].players[pi], [field]: val }
    setTeams(u)
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!selectedPkg) return toast.error('Please select a package')
    if (!form.company || !form.name || !form.email || !form.phone) return toast.error('Please fill in all contact fields')

    // Validate team players if applicable
    for (let ti = 0; ti < teams.length; ti++) {
      for (let pi = 0; pi < teams[ti].players.length; pi++) {
        if (!teams[ti].players[pi].full_name) {
          return toast.error(`Team ${ti + 1}, Player ${pi + 1}: Name is required`)
        }
      }
    }

    setSubmitting(true)
    try {
      let proofUrl = null
      if (paymentFile) {
        const ext = paymentFile.name.split('.').pop()
        const path = `sponsors/${event.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, paymentFile)
        if (upErr) throw upErr
        proofUrl = path
      }

      // Create sponsor registration
      const { error } = await supabase.from('sponsor_registrations').insert({
        event_id: event.id,
        package_id: selectedPkg.id,
        company_name: form.company,
        contact_name: form.name,
        contact_email: form.email.trim().toLowerCase(),
        contact_phone: form.phone,
        message: form.message,
        amount_due: selectedPkg.price,
        payment_status: paymentFile ? 'uploaded' : 'pending',
        payment_proof_url: proofUrl,
      })
      if (error) throw error

      // Create complimentary registrations for each team
      for (const team of teams) {
        const { data: reg, error: regErr } = await supabase.from('registrations').insert({
          event_id: event.id,
          registration_type: 'fourball',
          team_name: team.team_name || `${form.company} Team`,
          contact_name: form.name,
          contact_email: form.email.trim().toLowerCase(),
          contact_phone: form.phone,
          company: form.company,
          amount_due: 0,
          payment_status: 'verified',
          status: 'confirmed',
          special_requests: `Complimentary ${event.fourball_label || '4-Ball'} — ${selectedPkg.name} Sponsor`,
        }).select().single()
        if (regErr) throw regErr

        const playerInserts = team.players.map((p, i) => ({
          registration_id: reg.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          player_number: i + 1,
        }))
        const { error: plErr } = await supabase.from('players').insert(playerInserts)
        if (plErr) throw plErr
      }

      toast.success('Sponsorship submitted!')
      navigate('/success', { state: { eventTitle: event.title, isSponsor: true, event } })
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!event) return <div className="page container"><p>Event not found.</p></div>

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <Link to={`/event/${slug}`} className="text-muted" style={{ fontSize: '0.8rem' }}>← Back to {event.title}</Link>
        <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 32 }}>
          <h1 style={{ marginBottom: 6 }}>Sponsorship <span className="text-gold">Opportunities</span></h1>
          <p className="text-muted">{event.title}</p>
        </div>

        {packages.length === 0 ? (
          <div className="empty-state">
            <p>No sponsorship packages available yet.</p>
            <Link to={`/event/${slug}`} className="btn btn-outline mt-3" style={{ textDecoration: 'none' }}>← Back to Event</Link>
          </div>
        ) : (
          <>
            {/* Package Cards */}
            <div style={{ display: 'grid', gap: 16, marginBottom: 40 }}>
              {packages.map(pkg => {
                const tc = tierConfig[pkg.tier] || tierConfig.custom
                const isSelected = selectedPkg?.id === pkg.id
                return (
                  <div key={pkg.id} onClick={() => setSelectedPkg(pkg)} style={{
                    background: isSelected ? tc.bg : '#fff',
                    border: isSelected ? `2px solid ${tc.color}` : '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: 24, cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.08)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.6rem' }}>{tc.emoji}</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{pkg.name}</h3>
                          {pkg.includes_fourball && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>
                              🏌️ Includes {pkg.fourball_count} x complimentary {event.fourball_label || '4-Ball'}{pkg.fourball_count > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.4rem', color: tc.color }}>
                        R{Number(pkg.price).toLocaleString()}
                      </div>
                    </div>
                    {(pkg.benefits || []).length > 0 && (
                      <div style={{ display: 'grid', gap: 6 }}>
                        {pkg.benefits.map((b, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--green)', flexShrink: 0 }}>✅</span>
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isSelected && (
                      <div style={{ marginTop: 14, padding: '8px 14px', background: tc.color, color: '#fff', borderRadius: 'var(--radius)', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                        Selected ✓
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Registration Form */}
            {selectedPkg && (
              <div id="sponsor-form">
                <h2 style={{ marginBottom: 20 }}>Register as <span className="text-gold">{selectedPkg.name}</span></h2>

                <div className="form-section">
                  <div className="form-section-title">Company Details</div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Company Name *</label>
                      <input className="form-input" value={form.company} onChange={e => set('company', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Person *</label>
                      <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input className="form-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Message / Notes</label>
                    <textarea className="form-textarea" value={form.message} onChange={e => set('message', e.target.value)} placeholder="Any questions or special requests..." />
                  </div>
                </div>

                {/* Complimentary Team Details */}
                {teams.length > 0 && (
                  <>
                    <div style={{ marginBottom: 12, marginTop: 8 }}>
                      <h2 style={{ marginBottom: 4 }}>Complimentary <span className="text-gold">{event.fourball_label || '4-Ball'}{teams.length > 1 ? 's' : ''}</span></h2>
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>Enter your player details below — {teams.length} x {event.fourball_label || '4-Ball'} included with this package</p>
                    </div>
                    {teams.map((team, ti) => (
                      <div className="form-section" key={ti}>
                        <div className="form-section-title">
                          {teams.length > 1 ? `Team ${ti + 1}` : `${event.fourball_label || '4-Ball'} Team`}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Team Name</label>
                          <input className="form-input" value={team.team_name} onChange={e => updateTeamName(ti, e.target.value)} placeholder={`e.g. ${form.company || 'Company'} Team ${teams.length > 1 ? ti + 1 : ''}`} />
                        </div>
                        {team.players.map((p, pi) => (
                          <div key={pi} style={{
                            padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            background: 'var(--bg)', marginBottom: 10,
                          }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Player {pi + 1}</div>
                            <div className="grid-2" style={{ gap: 10 }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Full Name *</label>
                                <input className="form-input" value={p.full_name} onChange={e => updatePlayer(ti, pi, 'full_name', e.target.value)} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={p.email} onChange={e => updatePlayer(ti, pi, 'email', e.target.value)} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Phone</label>
                                <input className="form-input" type="tel" value={p.phone} onChange={e => updatePlayer(ti, pi, 'phone', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {/* Payment */}
                <div className="form-section">
                  <div className="form-section-title">Payment</div>
                  <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-muted">Package: </span><strong>{selectedPkg.name}</strong>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--gold)' }}>R{Number(selectedPkg.price).toLocaleString()}</span>
                    </div>
                  </div>
                  {event.banking_name && (
                    <div style={{ marginBottom: 20, padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>EFT Banking Details</div>
                      <div><span className="text-muted">Account:</span> {event.banking_name}</div>
                      <div><span className="text-muted">Bank:</span> {event.banking_bank}</div>
                      <div><span className="text-muted">Acc No:</span> {event.banking_account_no}</div>
                      <div><span className="text-muted">Branch:</span> {event.banking_branch_code}</div>
                      {event.banking_reference_note && <div style={{ marginTop: 8, color: 'var(--gold)', fontStyle: 'italic', fontSize: '0.8rem' }}>{event.banking_reference_note}</div>}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Upload Proof of Payment</label>
                    <div className={`file-upload ${paymentFile ? 'has-file' : ''}`} onClick={() => document.getElementById('sponsor-pop').click()}>
                      {paymentFile ? (
                        <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div><div style={{ fontWeight: 600 }}>{paymentFile.name}</div></>
                      ) : (
                        <><div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📎</div><div style={{ fontWeight: 500 }}>Click to upload</div><div className="text-muted mt-1">PDF, JPG or PNG</div></>
                      )}
                    </div>
                    <input id="sponsor-pop" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => setPaymentFile(e.target.files[0])} />
                  </div>
                </div>

                <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : `Submit Sponsorship — R${Number(selectedPkg.price).toLocaleString()}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
