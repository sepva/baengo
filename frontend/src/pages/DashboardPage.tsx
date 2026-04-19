import { useState } from "react";
import Header from "../components/Header";
import BingoGrid from "../components/BingoGrid";
import ScoreBoard from "../components/ScoreBoard";
import Leaderboard from "../components/Leaderboard";

export default function DashboardPage() {
  const username = localStorage.getItem("username") || "Player";
  const userId = parseInt(localStorage.getItem("userId") || "0");
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);

  const handleBaengo = () => {
    setLeaderboardRefresh((prev) => prev + 1);
  };

  const handlePointsAdded = () => {
    setLeaderboardRefresh((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-transparent text-[#e8edf2]">
      <Header username={username} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content (Bingo Grid) */}
          <div className="lg:col-span-2">
            <BingoGrid
              onBaengo={handleBaengo}
              onPointsAdded={handlePointsAdded}
            />
          </div>

          {/* Sidebar (Score + Leaderboards) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Score Board */}
            <ScoreBoard
              userId={userId}
              onPointsUpdated={() => setLeaderboardRefresh((prev) => prev + 1)}
            />

            {/* Quick Stats */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
              <h3 className="mb-4 text-lg font-bold text-[#f4f7fb]">
                How to Play
              </h3>
              <ul className="space-y-2 text-sm text-[#b8c0ca]">
                <li className="leading-relaxed">
                  ✓ Click items as you spot them in the office
                </li>
                <li className="leading-relaxed">
                  ✓ Complete a row or column = 10 points
                </li>
                <li className="leading-relaxed">
                  ✓ Complete the full card = 100 points + Baengo!
                </li>
                <li className="leading-relaxed">
                  ✓ Grid resets daily at midnight
                </li>
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
  );
}
