import { useState, useEffect } from 'react'
import { leaderboardApi } from '../api/client'

interface LeaderboardEntry {
  rank: number
  username: string
  userId: number
  points?: number
  bingoCount?: number
}

interface LeaderboardProps {
  refreshTrigger?: number
}

export default function Leaderboard({ refreshTrigger }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'points' | 'bingos'>('points')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [activeTab, refreshTrigger])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const response =
        activeTab === 'points'
          ? await leaderboardApi.getLifetime(50)
          : await leaderboardApi.getBingos(50)
      setLeaderboard(response.data.leaderboard || [])
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Leaderboard</h3>

      {/* Tab buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('points')}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeTab === 'points'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🏆 Most Points
        </button>
        <button
          onClick={() => setActiveTab('bingos')}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeTab === 'bingos'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🎉 Most Bingos
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-gray-600 font-semibold">Rank</th>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold">Player</th>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold">
                  {activeTab === 'points' ? 'Points' : 'Bingos'}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr
                  key={entry.userId}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                    idx < 3 ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-lg">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{entry.username}</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-600">
                    {activeTab === 'points' ? entry.points : entry.bingoCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
