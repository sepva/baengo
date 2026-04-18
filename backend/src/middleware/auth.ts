import { Context, Next } from 'hono'
import * as jwt from 'jsonwebtoken'

export interface AuthPayload {
  userId: number
  username: string
}

const JWT_SECRET = 'your-secret-key-change-in-production' // Should come from env

export async function verifyAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload
    c.set('user', decoded)
    await next()
  } catch (err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401)
  }
}

export function generateToken(userId: number, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' })
}
