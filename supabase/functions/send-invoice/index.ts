import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = 'beatrootpine@gmail.com'
const FROM_NAME = 'AME Church Ebenezer Temple'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  try {
    const { invoice_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    // Fetch invoice with registration + event details
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        registrations (
          contact_name, contact_email, contact_phone, company,
          registration_type, team_name, amount_due,
          events ( title, event_date, banking_name, banking_bank, banking_account_no, banking_branch_code )
        )
      `)
      .eq('id', invoice_id)
      .single()

    if (error || !invoice) throw new Error('Invoice not found')

    const reg = invoice.registrations
    const event = reg.events
    const eventDate = new Date(event.event_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Please pay within 7 days'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #f4f4f4; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #4a2080; color: #fff; padding: 32px 40px; }
  .header h1 { margin: 0 0 4px; font-size: 1.4rem; }
  .header p { margin: 0; opacity: 0.8; font-size: 0.9rem; }
  .body { padding: 32px 40px; }
  .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 0.85rem; }
  .invoice-meta div { color: #666; }
  .invoice-meta strong { color: #1a1a1a; display: block; font-size: 1rem; }
  .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
  .line-item { display: flex; justify-content: space-between; padding: 10px 0; font-size: 0.9rem; }
  .total-row { display: flex; justify-content: space-between; padding: 16px 0; font-weight: 700; font-size: 1.1rem; border-top: 2px solid #4a2080; color: #4a2080; }
  .banking { background: #f8f4ff; border: 1px solid #d4b8f0; border-radius: 6px; padding: 16px 20px; margin: 24px 0; font-size: 0.85rem; }
  .banking h3 { margin: 0 0 10px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
  .banking p { margin: 4px 0; }
  .ref-box { background: #4a2080; color: #fff; border-radius: 4px; padding: 8px 14px; display: inline-block; margin-top: 10px; font-weight: 700; font-size: 0.9rem; }
  .footer { background: #f9f9f9; padding: 20px 40px; font-size: 0.78rem; color: #999; text-align: center; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Invoice ${invoice.invoice_number}</h1>
    <p>AME Church, Ebenezer Temple — Fundraising Golf Day</p>
  </div>
  <div class="body">
    <div class="invoice-meta">
      <div>
        <div>Billed To</div>
        <strong>${reg.contact_name}</strong>
        ${reg.company ? `<span style="color:#666;font-size:0.85rem">${reg.company}</span>` : ''}
      </div>
      <div style="text-align:right">
        <div>Invoice Date</div>
        <strong>${new Date(invoice.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        <div style="margin-top:8px">Due Date</div>
        <strong>${dueDate}</strong>
      </div>
    </div>
    <hr class="divider">
    <div class="line-item">
      <span>${reg.registration_type === 'fourball' ? `4-Ball Entry — ${reg.team_name || 'Team'}` : 'Individual Entry'} · ${event.title}</span>
      <span>R${Number(reg.amount_due).toLocaleString()}</span>
    </div>
    <div class="line-item" style="color:#666;font-size:0.82rem">
      <span>Event Date: ${eventDate}</span>
      <span>Centurion Golf Course</span>
    </div>
    <div class="total-row">
      <span>Total Due</span>
      <span>R${Number(invoice.amount_due).toLocaleString()}</span>
    </div>
    ${event.banking_name ? `
    <div class="banking">
      <h3>EFT Banking Details</h3>
      <p><strong>Account Name:</strong> ${event.banking_name}</p>
      <p><strong>Bank:</strong> ${event.banking_bank}</p>
      <p><strong>Account No:</strong> ${event.banking_account_no}</p>
      <p><strong>Branch Code:</strong> ${event.banking_branch_code}</p>
      <p style="margin-top:10px;color:#666;font-size:0.8rem">Use this as your payment reference:</p>
      <div class="ref-box">${reg.registration_type === 'fourball' ? (reg.team_name || 'Team Name') : reg.contact_name}</div>
    </div>
    ` : ''}
    <p style="font-size:0.85rem;color:#666;margin-top:16px">
      Once payment is made, please upload your proof of payment at 
      <a href="https://amecatteridgeville.vercel.app/my-registration" style="color:#4a2080">My Registration</a> 
      or reply to this email.
    </p>
  </div>
  <div class="footer">
    AME Church Ebenezer Temple · Atteridgeville, Pretoria West<br>
    Non-Profit Organisation · Fundraising Golf Day ${new Date().getFullYear()}
  </div>
</div>
</body>
</html>`

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: reg.contact_email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `Invoice ${invoice.invoice_number} — ${event.title}`,
        content: [{ type: 'text/html', value: html }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
