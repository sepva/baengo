import { useState, useEffect } from 'react'
import { leaderboardApi } from '../api/client'

interface ScoreBoardProps {
  userId?: number
  onPointsUpdated?: (points: number, bingoCount: number) => void
}

export default function ScoreBoard({ userId, onPointsUpdated }: ScoreBoardProps) {
  const [stats, setStats] = useState({
    points: 0,
    bingoCount: 0,
    pointsRank: 0,
    bingoRank: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadStats()
    }
  }, [userId])

  const loadStats = async () => {
    try {
      if (!userId) return
      const response = await leaderboardApi.getUserStats(userId)
      setStats(response.data)
      onPointsUpdated?.(response.data.points, response.data.bingoCount)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load stats:', error)
      setLoading(false)
    }
  }

  const refreshStats = () => {
    setLoading(true)
    loadStats()
  }

  if (loading && userId) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-gray-500 text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Your Stats</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4">
          <div className="text-4xl font-bold text-purple-600">{stats.points}</div>
          <div className="text-sm text-gray-600">Total Points</div>
          <div className="text-xs text-gray-500 mt-1">Rank: #{stats.pointsRank}</div>
        </div>

        <div className="bg-white rounded-lg p-4">
          <div className="text-4xl font-bold text-blue-600">{stats.bingoCount}</div>
          <div className="text-sm text-gray-600">Bingos</div>
          <div className="text-xs text-gray-500 mt-1">Rank: #{stats.bingoRank}</div>
        </div>
      </div>

      <button
        onClick={refreshStats}
        className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
      >
        Refresh Stats
      </button>
    </div>
  )
}
