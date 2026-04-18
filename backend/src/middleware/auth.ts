import { Context, Next } from 'hono'
import * as jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

export interface AuthPayload {
  userId: number
  username: string
}

type AuthContext = {
  Bindings: {
    JWT_SECRET: string
  }
  Variables: {
    user: AuthPayload
  }
}

export async function verifyAuth(c: Context<AuthContext>, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, c.env.JWT_SECRET) as AuthPayload
    c.set('user', decoded)
    await next()
  } catch (err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401)
  }
}

/**
 * Generate JWT access token
 * Expires in 15 minutes
 */
export function generateToken(userId: number, username: string, jwtSecret: string): string {
  return jwt.sign({ userId, username }, jwtSecret, { expiresIn: '15m' })
}

/**
 * Generate refresh token
 * Returns a random token string (actual expiry stored in DB)
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Get refresh token expiry date
 * Returns ISO timestamp for 7 days from now
 */
export function getRefreshTokenExpiry(): string {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 7)
  return expiryDate.toISOString()
}
