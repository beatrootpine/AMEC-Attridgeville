import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = 'noreply@amecgolfday.co.za'
const FROM_NAME = 'AME Church Ebenezer Temple'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  try {
    const { event_id } = await req.json().catch(() => ({}))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        registrations ( contact_name, contact_email, company, registration_type, team_name, event_id, events ( title, event_date, banking_name, banking_bank, banking_account_no, banking_branch_code ) ),
        sponsor_registrations ( contact_name, contact_email, company_name, event_id, sponsor_packages ( name ), events ( title, event_date, banking_name, banking_bank, banking_account_no, banking_branch_code ) )
      `)
      .eq('status', 'unpaid')

    if (error) throw error

    const toSend = (invoices || []).filter(inv => {
      if (Number(inv.amount_due) === 0) return false
      const email = inv.registrations?.contact_email || inv.sponsor_registrations?.contact_email
      if (!email) return false
      if (event_id) {
        const eid = inv.registrations?.event_id || inv.sponsor_registrations?.event_id
        return eid === event_id
      }
      return true
    })

    const results = []

    for (const inv of toSend) {
      const isSponsor = !!inv.sponsor_registration_id
      const contactName = isSponsor ? inv.sponsor_registrations?.contact_name : inv.registrations?.contact_name
      const contactEmail = isSponsor ? inv.sponsor_registrations?.contact_email : inv.registrations?.contact_email
      const company = isSponsor ? inv.sponsor_registrations?.company_name : inv.registrations?.company
      const event = isSponsor ? inv.sponsor_registrations?.events : inv.registrations?.events
      const packageName = isSponsor
        ? (inv.sponsor_registrations?.sponsor_packages?.name || 'Sponsorship')
        : (inv.registrations?.registration_type === 'fourball' ? `4-Ball — ${inv.registrations?.team_name || ''}` : 'Individual Entry')
      const paymentRef = isSponsor
        ? (inv.sponsor_registrations?.company_name || contactName)
        : (inv.registrations?.registration_type === 'fourball' ? (inv.registrations?.team_name || contactName) : contactName)

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f4f4f4}
.w{max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.hd{background:#591a4a;color:#fff;padding:28px 36px}
.hd h1{margin:0 0 4px;font-size:1.2rem}
.hd p{margin:0;opacity:.85;font-size:.85rem}
.bd{padding:28px 36px}
.amt{background:#f8f0ff;border:2px solid #591a4a;border-radius:8px;padding:18px;text-align:center;margin:20px 0}
.amt .lbl{font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:#666}
.amt .num{font-size:2rem;font-weight:700;color:#591a4a;margin:4px 0}
.bank{background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:14px 18px;margin:18px 0;font-size:.82rem}
.ref{background:#591a4a;color:#fff;border-radius:4px;padding:7px 14px;display:inline-block;margin-top:8px;font-weight:700;font-size:.9rem}
.ft{background:#f9f9f9;padding:16px 36px;font-size:.72rem;color:#999;text-align:center}
</style></head>
<body><div class="w">
  <div class="hd">
    <h1>Payment Reminder</h1>
    <p>${inv.invoice_number} · ${event?.title || 'Fundraising Golf Day'}</p>
  </div>
  <div class="bd">
    <p>Dear ${contactName}${company ? ` (${company})` : ''},</p>
    <p>This is a friendly reminder that your payment for the <strong>${event?.title || 'Fundraising Golf Day'}</strong> is still outstanding.</p>
    <p style="font-size:.85rem;color:#555"><strong>Entry:</strong> ${packageName}</p>
    <div class="amt">
      <div class="lbl">Outstanding Balance</div>
      <div class="num">R${Number(inv.amount_due).toLocaleString()}</div>
      <div style="font-size:.78rem;color:#666">${inv.invoice_number}</div>
    </div>
    ${event?.banking_name ? `<div class="bank">
      <strong>EFT Banking Details</strong><br><br>
      <strong>Account Name:</strong> ${event.banking_name}<br>
      <strong>Bank:</strong> ${event.banking_bank}<br>
      <strong>Account No:</strong> ${event.banking_account_no}<br>
      <strong>Branch Code:</strong> ${event.banking_branch_code}<br>
      <br>Use this as your payment reference:
      <div class="ref">${paymentRef}</div>
    </div>` : ''}
    <p style="font-size:.83rem;color:#555;margin-top:16px">After payment please upload your proof of payment at <a href="https://amec-attridgeville.vercel.app/my-registration" style="color:#591a4a">My Registration</a>.</p>
    <p style="font-size:.83rem;color:#555">If you have already paid please disregard this message.</p>
  </div>
  <div class="ft">AME Church Ebenezer Temple · Atteridgeville Township, Pretoria West<br>Fundraising Golf Day — Church Building Project &amp; Community Initiatives</div>
</div></body></html>`

      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: contactEmail }] }],
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: `Payment Reminder: ${inv.invoice_number} — R${Number(inv.amount_due).toLocaleString()} Outstanding`,
            content: [{ type: 'text/html', value: html }],
          }),
        })
        if (res.ok) {
          await supabase.from('invoices').update({
            reminder_count: (inv.reminder_count || 0) + 1,
            last_reminder_at: new Date().toISOString(),
          }).eq('id', inv.id)
          results.push({ name: contactName, email: contactEmail, invoice: inv.invoice_number, amount: inv.amount_due, sent: true })
        } else {
          results.push({ name: contactName, email: contactEmail, invoice: inv.invoice_number, sent: false })
        }
      } catch (e) {
        results.push({ name: contactName, email: contactEmail, invoice: inv.invoice_number, sent: false })
      }
    }

    return new Response(JSON.stringify({ success: true, total: results.length, sent: results.filter(r => r.sent).length, results }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
