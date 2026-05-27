const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = 'beatrootpine@gmail.com'
const FROM_NAME = 'AME Church Ebenezer Temple'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { recipients, subject, body, event_title } = await req.json()
    if (!recipients?.length) throw new Error('No recipients provided')
    if (!subject) throw new Error('No subject provided')
    if (!body) throw new Error('No body provided')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f4f4f4}
.w{max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.hd{background:#591a4a;color:#fff;padding:28px 36px}
.hd h1{margin:0 0 4px;font-size:1.2rem}
.hd p{margin:0;opacity:.85;font-size:.85rem}
.bd{padding:28px 36px;font-size:.9rem;line-height:1.7;white-space:pre-wrap}
.ft{background:#f9f9f9;padding:16px 36px;font-size:.72rem;color:#999;text-align:center}
</style></head>
<body><div class="w">
  <div class="hd">
    <h1>${event_title || 'AME Church Ebenezer Temple'}</h1>
    <p>Fundraising Golf Day · 31 July 2026</p>
  </div>
  <div class="bd">${body.replace(/\n/g, '<br>')}</div>
  <div class="ft">AME Church Ebenezer Temple · Atteridgeville Township, Pretoria West<br>Fundraising Golf Day — Church Building Project &amp; Community Initiatives</div>
</div></body></html>`

    let sent = 0
    for (const email of recipients) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      })
      if (res.ok) sent++
    }

    return new Response(JSON.stringify({ success: true, total: recipients.length, sent }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
