import prisma from '../lib/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reminders: true
      }
    })

    return res.status(200).json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        password: user.password,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        reminderCount: user.reminders.length
      }))
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    return res.status(500).json({ error: 'Unable to fetch users.' })
  }
}
