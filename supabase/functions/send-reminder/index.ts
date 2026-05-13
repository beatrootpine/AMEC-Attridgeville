import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'noreply@amecatteridgeville.co.za'
const FROM_NAME = 'AME Church Ebenezer Temple'

// Reminder schedule: send at 3 days, 7 days, 14 days after invoice creation
const REMINDER_DAYS = [3, 7, 14]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    // Check if this is a manual reminder (specific invoice_id passed)
    let specificInvoiceId = null
    try {
      const body = await req.json()
      specificInvoiceId = body?.invoice_id || null
    } catch (_) {}

    // Fetch unpaid invoices
    let query = supabase
      .from('invoices')
      .select(`
        *,
        registrations (
          contact_name, contact_email, company,
          registration_type, team_name, amount_due,
          events ( title, event_date, banking_name, banking_bank, banking_account_no, banking_branch_code )
        )
      `)
      .eq('status', 'unpaid')

    if (specificInvoiceId) {
      query = query.eq('id', specificInvoiceId)
    }

    const { data: invoices, error } = await query
    if (error) throw error

    const results = []
    const now = new Date()

    for (const invoice of invoices || []) {
      const reg = invoice.registrations
      if (!reg?.contact_email) continue

      const daysSinceCreated = Math.floor((now - new Date(invoice.created_at)) / (1000 * 60 * 60 * 24))
      const daysSinceLastReminder = invoice.last_reminder_at
        ? Math.floor((now - new Date(invoice.last_reminder_at)) / (1000 * 60 * 60 * 24))
        : null

      // For manual reminders: always send. For auto: check schedule
      const shouldSend = specificInvoiceId
        ? true
        : REMINDER_DAYS.some(d => {
            if (daysSinceCreated < d) return false
            if (invoice.reminder_count === 0 && daysSinceCreated >= REMINDER_DAYS[0]) return true
            return daysSinceLastReminder !== null && daysSinceLastReminder >= 7
          })

      if (!shouldSend) continue
      if (invoice.reminder_count >= 3 && !specificInvoiceId) continue // max 3 auto reminders

      const event = reg.events
      const reminderNum = invoice.reminder_count + 1
      const urgency = reminderNum >= 3 ? '🚨 Final Notice' : reminderNum === 2 ? '⚠️ Second Reminder' : '📋 Payment Reminder'

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #f4f4f4; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: ${reminderNum >= 3 ? '#c0392b' : reminderNum === 2 ? '#e67e22' : '#4a2080'}; color: #fff; padding: 28px 40px; }
  .header h1 { margin: 0 0 4px; font-size: 1.3rem; }
  .body { padding: 32px 40px; }
  .amount-box { background: #f8f4ff; border: 2px solid #4a2080; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
  .amount-box .label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
  .amount-box .amount { font-size: 2rem; font-weight: 700; color: #4a2080; margin: 4px 0; }
  .banking { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 16px 20px; margin: 20px 0; font-size: 0.85rem; }
  .ref-box { background: #4a2080; color: #fff; border-radius: 4px; padding: 8px 14px; display: inline-block; margin-top: 8px; font-weight: 700; }
  .footer { background: #f9f9f9; padding: 20px 40px; font-size: 0.78rem; color: #999; text-align: center; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${urgency}</h1>
    <p style="margin:0;opacity:0.85;font-size:0.88rem">Invoice ${invoice.invoice_number} · ${event.title}</p>
  </div>
  <div class="body">
    <p>Dear ${reg.contact_name},</p>
    <p>This is a ${reminderNum === 1 ? 'friendly reminder' : reminderNum === 2 ? 'second reminder' : 'final notice'} that your payment for the <strong>${event.title}</strong> is still outstanding.</p>
    
    <div class="amount-box">
      <div class="label">Outstanding Balance</div>
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
      <div class="ref-box">${reg.registration_type === 'fourball' ? (reg.team_name || reg.contact_name) : reg.contact_name}</div>
    </div>
    ` : ''}

    <p style="font-size:0.85rem;color:#555">
      After payment, please upload your proof of payment at 
      <a href="https://amecatteridgeville.vercel.app/my-registration" style="color:#4a2080">My Registration</a>.
    </p>
    ${reminderNum >= 3 ? `<p style="color:#c0392b;font-size:0.85rem;font-weight:600">⚠️ Failure to pay may result in your registration being cancelled.</p>` : ''}
    <p style="font-size:0.85rem;color:#555">If you have already paid, please disregard this message or reply to confirm.</p>
  </div>
  <div class="footer">
    AME Church Ebenezer Temple · Atteridgeville, Pretoria West
  </div>
</div>
</body>
</html>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [reg.contact_email],
          subject: `${urgency}: Invoice ${invoice.invoice_number} — R${Number(invoice.amount_due).toLocaleString()} Outstanding`,
          html,
        }),
      })

      if (res.ok) {
        await supabase.from('invoices').update({
          reminder_count: invoice.reminder_count + 1,
          last_reminder_at: new Date().toISOString(),
        }).eq('id', invoice.id)

        results.push({ invoice_number: invoice.invoice_number, email: reg.contact_email, sent: true })
      } else {
        results.push({ invoice_number: invoice.invoice_number, email: reg.contact_email, sent: false })
      }
    }

    return new Response(JSON.stringify({ success: true, sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
