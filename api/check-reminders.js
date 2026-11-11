import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'Reminder <onboarding@resend.dev>'

  if (!apiKey || !process.env.POSTGRES_URL) {
    return res.status(200).json({
      processed: 0,
      message: 'Email scheduling is ready, but Postgres and Resend are not configured yet.'
    })
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT,
      email TEXT,
      "dueDate" DATE NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )`

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 30)

    const { rows } = await sql`
      SELECT * FROM reminders
      WHERE email IS NOT NULL
        AND email <> ''
        AND "dueDate" >= ${today.toISOString().slice(0, 10)}
        AND "dueDate" <= ${endDate.toISOString().slice(0, 10)}
      ORDER BY "dueDate" ASC
    `

    let sent = 0

    for (const reminder of rows) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [reminder.email],
          subject: `Reminder: ${reminder.title}`,
          html: `
            <h2>Document reminder</h2>
            <p>This is a reminder for <strong>${reminder.title}</strong>.</p>
            <p>Due date: <strong>${reminder.dueDate}</strong></p>
            <p>${reminder.notes || 'Please review this item before the due date.'}</p>
          `
        })
      })

      if (response.ok) {
        sent += 1
      }
    }

    return res.status(200).json({ processed: sent, total: rows.length })
  } catch (error) {
    console.error('Reminder check failed.', error)
    return res.status(500).json({ error: 'Could not check reminders.' })
  }
}
