import prisma from '../lib/prisma.js'

const fallbackReminders = globalThis.__fallbackReminders || (globalThis.__fallbackReminders = [])

const sortReminders = (items) => [...items].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

const getFallbackReminders = () => sortReminders(fallbackReminders)

export default async function handler(req, res) {
  const method = req.method || 'GET'

  if (method === 'GET') {
    const email = req.query.email || req.headers['x-user-email']

    if (!email) {
      return res.status(400).json({ error: 'User email is required.' })
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: String(email).toLowerCase() }
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found.' })
      }

      const reminders = await prisma.reminder.findMany({
        where: { userId: user.id },
        orderBy: { dueDate: 'asc' }
      })

      return res.status(200).json({ reminders })
    } catch (error) {
      console.error('Prisma reminder fetch failed, using local fallback.', error)
    }

    return res.status(200).json({ reminders: getFallbackReminders() })
  }

  if (method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { email, title, dueDate, category = 'Other', notes = '' } = body

    if (!email || !title || !dueDate) {
      return res.status(400).json({ error: 'Email, title, and due date are required.' })
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: String(email).toLowerCase() }
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found.' })
      }

      const reminder = await prisma.reminder.create({
        data: {
          userId: user.id,
          title: String(title).trim(),
          category: String(category).trim() || 'Other',
          dueDate: new Date(dueDate),
          notes: String(notes).trim()
        }
      })

      return res.status(201).json({ reminder })
    } catch (error) {
      console.error('Prisma reminder create failed, using local fallback.', error)
    }

    const fallbackReminder = {
      id: body.id || crypto?.randomUUID?.() || `${Date.now()}`,
      title: String(title).trim(),
      dueDate,
      category: String(category).trim() || 'Other',
      notes: String(notes).trim(),
      email: String(email).trim(),
      createdAt: new Date().toISOString()
    }

    fallbackReminders.unshift(fallbackReminder)
    return res.status(201).json({ reminder: fallbackReminder })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
