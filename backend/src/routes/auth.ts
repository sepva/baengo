import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth'

interface Env {
  DB: D1Database
}

const auth = new Hono<{ Bindings: Env }>()

// Register endpoint
auth.post('/register', async (c) => {
  try {
    const { username, password } = await c.req.json()

    if (!username || !password) {
      return c.json({ error: 'Bad Request', message: 'Username and password are required' }, 400)
    }

    if (password.length < 6) {
      return c.json({ error: 'Bad Request', message: 'Password must be at least 6 characters' }, 400)
    }

    const db = c.env.DB
    
    // Check if user already exists
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) {
      return c.json({ error: 'Conflict', message: 'Username already exists' }, 409)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const result = await db
      .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
      .bind(username, hashedPassword, new Date().toISOString())
      .run()

    const userId = result.meta.last_row_id as number
    const token = generateToken(userId, username)

    // Initialize user scores
    await db
      .prepare('INSERT INTO user_scores (user_id, points, bingo_count, updated_at) VALUES (?, ?, ?, ?)')
      .bind(userId, 0, 0, new Date().toISOString())
      .run()

    return c.json({
      message: 'User registered successfully',
      token,
      userId,
      username
    }, 201)
  } catch (err) {
    console.error('Register error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

// Login endpoint
auth.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json()

    if (!username || !password) {
      return c.json({ error: 'Bad Request', message: 'Username and password are required' }, 400)
    }

    const db = c.env.DB

    // Find user
    const user = await db
      .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
      .bind(username)
      .first() as { id: number; username: string; password_hash: string } | undefined

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Invalid credentials' }, 401)
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return c.json({ error: 'Unauthorized', message: 'Invalid credentials' }, 401)
    }

    const token = generateToken(user.id, user.username)

    return c.json({
      message: 'Login successful',
      token,
      userId: user.id,
      username: user.username
    })
  } catch (err) {
    console.error('Login error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

// Logout endpoint (client-side token removal, but useful for API validation)
auth.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' })
})

export default auth
