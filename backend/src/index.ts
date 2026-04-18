import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/auth'
import gridRoutes from './routes/grid'
import leaderboardRoutes from './routes/leaderboard'

export interface Env {
  DB: D1Database
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/', (c) => {
  return c.json({ message: 'Baengo API is running', version: '1.0.0' })
})

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/grid', gridRoutes)
app.route('/api/leaderboard', leaderboardRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'The requested endpoint does not exist' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json(
    { error: 'Internal Server Error', message: err.message || 'An unexpected error occurred' },
    500
  )
})

export default app
