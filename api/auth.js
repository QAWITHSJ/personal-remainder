import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  const { action, email, password } = body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  try {
    if (action === 'signup') {
      const existingUser = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })

      if (existingUser) {
        return res.status(409).json({ error: 'User already exists.' })
      }

      const passwordHash = await bcrypt.hash(String(password), 10)
      const newUser = await prisma.user.create({
        data: {
          email: String(email).toLowerCase(),
          password: passwordHash,
          role: 'USER'
        }
      })

      return res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
          lastLoginAt: newUser.lastLoginAt
        }
      })
    }

    if (action === 'login') {
      const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' })
      }

      const isValidPassword = await bcrypt.compare(String(password), user.password)
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password.' })
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date()
        }
      })

      return res.status(200).json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt,
          lastLoginAt: updatedUser.lastLoginAt
        }
      })
    }

    return res.status(400).json({ error: 'Invalid action.' })
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Unable to process authentication.' })
  }
}
