import { Hono } from 'hono'
import { ValidationError } from '../utils/error-mapper'

interface Env {
  DB: D1Database
}

interface LeaderboardEntry {
  rank: number
  username: string
  userId: number
  points?: number
  bingoCount?: number
}

const leaderboard = new Hono<{ Bindings: Env }>()

/**
 * Validate and parse limit query parameter
 * Must be integer between 1 and 100
 */
function validateLimit(limitParam: string | undefined): number {
  const DEFAULT_LIMIT = 50
  const MAX_LIMIT = 100
  const MIN_LIMIT = 1

  if (!limitParam) return DEFAULT_LIMIT

  const limit = parseInt(limitParam, 10)
  if (isNaN(limit)) {
    throw new ValidationError(`Limit must be a valid integer`)
  }
  if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
    throw new ValidationError(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`)
  }

  return limit
}

// Get lifetime leaderboard (by points)
leaderboard.get('/lifetime', async (c) => {
  try {
    const db = c.env.DB
    const limit = validateLimit(c.req.query('limit'))

    const result = await db
      .prepare(`
        SELECT 
          u.id as userId,
          u.username,
          us.points,
          us.bingo_count as bingoCount,
          ROW_NUMBER() OVER (ORDER BY us.points DESC, us.updated_at DESC) as rank
        FROM user_scores us
        JOIN users u ON u.id = us.user_id
        ORDER BY us.points DESC, us.updated_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all()

    const entries = (result.results as any[]).map(row => ({
      rank: row.rank,
      username: row.username,
      userId: row.userId,
      points: row.points,
      bingoCount: row.bingoCount
    }))

    return c.json({
      leaderboard: entries,
      total: result.results?.length || 0
    })
  } catch (err) {
    console.error('Lifetime leaderboard error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

// Get bingo count leaderboard
leaderboard.get('/bingos', async (c) => {
  try {
    const db = c.env.DB
    const limit = validateLimit(c.req.query('limit'))

    const result = await db
      .prepare(`
        SELECT 
          u.id as userId,
          u.username,
          us.points,
          us.bingo_count as bingoCount,
          ROW_NUMBER() OVER (ORDER BY us.bingo_count DESC, us.points DESC) as rank
        FROM user_scores us
        JOIN users u ON u.id = us.user_id
        ORDER BY us.bingo_count DESC, us.points DESC
        LIMIT ?
      `)
      .bind(limit)
      .all()

    const entries = (result.results as any[]).map(row => ({
      rank: row.rank,
      username: row.username,
      userId: row.userId,
      points: row.points,
      bingoCount: row.bingoCount
    }))

    return c.json({
      leaderboard: entries,
      total: result.results?.length || 0
    })
  } catch (err) {
    console.error('Bingo leaderboard error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

// Get user's current rank and stats
leaderboard.get('/user/:userId', async (c) => {
  try {
    const db = c.env.DB
    const userId = parseInt(c.req.param('userId'))

    const user = await db
      .prepare('SELECT username FROM users WHERE id = ?')
      .bind(userId)
      .first() as { username: string } | undefined

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const score = await db
      .prepare('SELECT points, bingo_count FROM user_scores WHERE user_id = ?')
      .bind(userId)
      .first() as { points: number; bingo_count: number }

    // Get rank by points
    const pointsRank = await db
      .prepare('SELECT COUNT(*) + 1 as rank FROM user_scores WHERE points > ?')
      .bind(score.points)
      .first() as { rank: number }

    // Get rank by bingos
    const bingoRank = await db
      .prepare('SELECT COUNT(*) + 1 as rank FROM user_scores WHERE bingo_count > ?')
      .bind(score.bingo_count)
      .first() as { rank: number }

    return c.json({
      userId,
      username: user.username,
      points: score.points,
      bingoCount: score.bingo_count,
      pointsRank: pointsRank.rank,
      bingoRank: bingoRank.rank
    })
  } catch (err) {
    console.error('User stats error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

export default leaderboard
