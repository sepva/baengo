import { useState } from 'react'
import Header from '../components/Header'
import BingoGrid from '../components/BingoGrid'
import ScoreBoard from '../components/ScoreBoard'
import Leaderboard from '../components/Leaderboard'

export default function DashboardPage() {
  const username = localStorage.getItem('username') || 'Player'
  const userId = parseInt(localStorage.getItem('userId') || '0')
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0)

  const handleBaengo = () => {
    setLeaderboardRefresh(prev => prev + 1)
  }

  const handlePointsAdded = () => {
    setLeaderboardRefresh(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header username={username} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content (Bingo Grid) */}
          <div className="lg:col-span-2">
            <BingoGrid onBaengo={handleBaengo} onPointsAdded={handlePointsAdded} />
          </div>

          {/* Sidebar (Score + Leaderboards) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Score Board */}
            <ScoreBoard userId={userId} onPointsUpdated={() => setLeaderboardRefresh(prev => prev + 1)} />

            {/* Quick Stats */}
            <div className="bg-blue-50 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">How to Play</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✓ Click items as you spot them in the office</li>
                <li>✓ Complete a row or column = 10 points</li>
                <li>✓ Complete the full card = 100 points + Baengo!</li>
                <li>✓ Grid resets daily at midnight (Brussels time)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Full-width Leaderboard */}
        <div className="mt-8">
          <Leaderboard refreshTrigger={leaderboardRefresh} />
        </div>
      </main>
    </div>
  )
}
