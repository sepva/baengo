import { useState, useEffect } from "react";
import { leaderboardApi } from "../api/client";

interface ScoreBoardProps {
  userId?: number;
  onPointsUpdated?: (points: number, baengoCount: number) => void;
}

export default function ScoreBoard({
  userId,
  onPointsUpdated,
}: ScoreBoardProps) {
  const [stats, setStats] = useState({
    points: 0,
    baengoCount: 0,
    pointsRank: 0,
    baengoRank: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    try {
      if (!userId) return;
      const response = await leaderboardApi.getUserStats(userId);
      setStats(response.data);
      onPointsUpdated?.(response.data.points, response.data.baengoCount);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load stats:", error);
      setLoading(false);
    }
  };

  const refreshStats = () => {
    setLoading(true);
    loadStats();
  };

  if (loading && userId) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <div className="text-center text-[#9ca6b2]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <h3 className="mb-4 text-xl font-bold text-[#f4f7fb]">Your Stats</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-[#131a22] p-4">
          <div className="text-4xl font-extrabold text-[#ff8f35]">
            {stats.points}
          </div>
          <div className="text-sm font-medium text-[#b8c0ca]">Total Points</div>
          <div className="mt-1 text-xs text-[#8491a0]">
            Rank: #{stats.pointsRank}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#131a22] p-4">
          <div className="text-4xl font-extrabold text-[#ff6d43]">
            {stats.baengoCount}
          </div>
          <div className="text-sm font-medium text-[#b8c0ca]">Baengos</div>
          <div className="mt-1 text-xs text-[#8491a0]">
            Rank: #{stats.baengoRank}
          </div>
        </div>
      </div>

      <button
        onClick={refreshStats}
        className="mt-4 w-full rounded-lg bg-gradient-to-r from-[#ff7c24] to-[#ff4f2a] px-4 py-2 font-semibold text-white shadow-[0_10px_24px_rgba(255,95,40,0.35)] transition hover:brightness-110"
      >
        Refresh Stats
      </button>
    </div>
  );
}
