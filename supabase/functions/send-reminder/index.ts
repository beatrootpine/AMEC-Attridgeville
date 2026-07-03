import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = 'beatrootpine@gmail.com'
const FROM_NAME = 'AME Church Ebenezer Temple'
const REMINDER_DAYS = [3, 7, 14]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

    let specificInvoiceId = null
    try { const body = await req.json(); specificInvoiceId = body?.invoice_id || null } catch (_) {}

    let query = supabase.from('invoices').select(`
      *,
      registrations ( contact_name, contact_email, company, registration_type, team_name, amount_due, events ( title, event_date, banking_name, banking_bank, banking_account_no, banking_branch_code ) ),
      sponsor_registrations ( contact_name, contact_email, company_name, amount_due, sponsor_packages ( name ), events ( title, event_date, banking_name, banking_bank, banking_account_no, banking_branch_code ) )
    `).eq('status', 'unpaid')

    if (specificInvoiceId) query = query.eq('id', specificInvoiceId)
    const { data: invoices, error } = await query
    if (error) throw error

    const results = []
    const now = new Date()

    for (const invoice of invoices || []) {
      const isSponsor = !!invoice.sponsor_registration_id
      const reg = invoice.registrations
      const sr = invoice.sponsor_registrations

      const contactName = isSponsor ? sr?.contact_name : reg?.contact_name
      const contactEmail = isSponsor ? sr?.contact_email : reg?.contact_email
      const company = isSponsor ? sr?.company_name : reg?.company
      const event = isSponsor ? sr?.events : reg?.events
      const paymentRef = isSponsor
        ? (sr?.company_name || sr?.contact_name)
        : (reg?.registration_type === 'fourball' ? (reg?.team_name || reg?.contact_name) : reg?.contact_name)

      if (!contactEmail || !event) continue

      const daysSinceCreated = Math.floor((now.getTime() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const daysSinceLastReminder = invoice.last_reminder_at
        ? Math.floor((now.getTime() - new Date(invoice.last_reminder_at).getTime()) / (1000 * 60 * 60 * 24))
        : null

      const shouldSend = specificInvoiceId
        ? true
        : REMINDER_DAYS.some(d => {
            if (daysSinceCreated < d) return false
            if (invoice.reminder_count === 0 && daysSinceCreated >= REMINDER_DAYS[0]) return true
            return daysSinceLastReminder !== null && daysSinceLastReminder >= 7
          })

      if (!shouldSend) continue
      if (invoice.reminder_count >= 3 && !specificInvoiceId) continue

      const reminderNum = invoice.reminder_count + 1
      const urgency = reminderNum >= 3 ? '🚨 Final Notice' : reminderNum === 2 ? '⚠️ Second Reminder' : '📋 Payment Reminder'

      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #f4f4f4; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { background: ${reminderNum >= 3 ? '#c0392b' : reminderNum === 2 ? '#e67e22' : '#591a4a'}; color: #fff; padding: 28px 40px; }
  .header h1 { margin: 0 0 4px; font-size: 1.3rem; }
  .body { padding: 32px 40px; }
  .amount-box { background: #faf5f8; border: 2px solid #591a4a; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
  .amount-box .amount { font-size: 2rem; font-weight: 700; color: #591a4a; }
  .banking { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 16px 20px; margin: 20px 0; font-size: 0.85rem; }
  .ref-box { background: #591a4a; color: #fff; border-radius: 4px; padding: 8px 14px; display: inline-block; margin-top: 8px; font-weight: 700; }
  .footer { background: #f9f9f9; padding: 20px 40px; font-size: 0.78rem; color: #999; text-align: center; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${urgency}</h1>
    <p style="margin:0;opacity:0.85;font-size:0.88rem">Invoice ${invoice.invoice_number} · ${event.title}</p>
  </div>
  <div class="body">
    <p>Dear ${contactName},</p>
    <p>This is a ${reminderNum === 1 ? 'friendly reminder' : reminderNum === 2 ? 'second reminder' : 'final notice'} that your payment for <strong>${event.title}</strong>${isSponsor ? ` (${sr?.sponsor_packages?.name || 'Sponsorship'})` : ''} is still outstanding.</p>
    <div class="amount-box">
      <div style="font-size:0.8rem;text-transform:uppercase;color:#666">Outstanding Balance</div>
      <div class="amount">R${Number(invoice.amount_due).toLocaleString()}</div>
      <div style="font-size:0.8rem;color:#666">Invoice ${invoice.invoice_number}</div>
    </div>
    ${event.banking_name ? `
    <div class="banking">
      <strong>EFT Payment Details</strong><br><br>
      <strong>Account Name:</strong> ${event.banking_name}<br>
      <strong>Bank:</strong> ${event.banking_bank}<br>
      <strong>Account No:</strong> ${event.banking_account_no}<br>
      <strong>Branch Code:</strong> ${event.banking_branch_code}<br>
      <br>Use this as your reference:
      <div class="ref-box">${paymentRef}</div>
    </div>
    ` : ''}
    <p style="font-size:0.85rem;color:#555">After payment, upload your proof at <a href="https://amecatteridgeville.vercel.app/my-registration" style="color:#591a4a">My Registration</a>.</p>
    ${reminderNum >= 3 ? '<p style="color:#c0392b;font-size:0.85rem;font-weight:600">⚠️ Failure to pay may result in your registration being cancelled.</p>' : ''}
    <p style="font-size:0.85rem;color:#555">If you have already paid, please disregard this message or reply to confirm.</p>
  </div>
  <div class="footer">AME Church Ebenezer Temple · 93 Sehlogo Street, Atteridgeville, Pretoria West</div>
</div>
</body></html>`

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: contactEmail }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject: `${urgency}: Invoice ${invoice.invoice_number} — R${Number(invoice.amount_due).toLocaleString()} Outstanding`,
          content: [{ type: 'text/html', value: html }],
        }),
      })

      if (res.ok) {
        await supabase.from('invoices').update({ reminder_count: invoice.reminder_count + 1, last_reminder_at: new Date().toISOString() }).eq('id', invoice.id)
        results.push({ invoice_number: invoice.invoice_number, email: contactEmail, sent: true })
      } else {
        results.push({ invoice_number: invoice.invoice_number, email: contactEmail, sent: false })
      }
    }

    return new Response(JSON.stringify({ success: true, sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
