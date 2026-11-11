export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  const { email, title, dueDate } = body

  if (!email || !title || !dueDate) {
    return res.status(400).json({ error: 'Email, title, and due date are required.' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'Reminder <onboarding@resend.dev>'

  if (!apiKey) {
    return res.status(400).json({
      error: 'Email service is not configured. Add RESEND_API_KEY and RESEND_FROM in Vercel.'
    })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Reminder: ${title}`,
        html: `
          <h2>Reminder alert</h2>
          <p>This is a reminder for: <strong>${title}</strong></p>
          <p>Due date: <strong>${dueDate}</strong></p>
        `
      })
    })

    const payload = await response.json()

    if (!response.ok) {
      return res.status(400).json({ error: payload?.message || 'Unable to send email.' })
    }

    return res.status(200).json({ success: true, message: 'Email sent.' })
  } catch (error) {
    console.error('Resend request failed.', error)
    return res.status(500).json({ error: 'Unable to send email right now.' })
  }
}
