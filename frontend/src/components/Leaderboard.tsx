import { useState, useEffect } from "react";
import { leaderboardApi } from "../api/client";

interface LeaderboardEntry {
  rank: number;
  username: string;
  userId: number;
  points?: number;
  baengoCount?: number;
}

interface LeaderboardProps {
  refreshTrigger?: number;
}

export default function Leaderboard({ refreshTrigger }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<"points" | "baengos">("points");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab, refreshTrigger]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const response =
        activeTab === "points"
          ? await leaderboardApi.getLifetime(50)
          : await leaderboardApi.getBaengos(50);
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <h3 className="mb-6 text-2xl font-bold text-[#f4f7fb]">Leaderboard</h3>

      {/* Tab buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab("points")}
          className={`rounded-lg px-6 py-2 font-semibold transition ${
            activeTab === "points"
              ? "bg-gradient-to-r from-[#ff7c24] to-[#ff4f2a] text-white shadow-[0_10px_24px_rgba(255,95,40,0.35)]"
              : "border border-white/15 bg-white/[0.03] text-[#c2cbd6] hover:border-[#ff8a2a]/60 hover:text-[#f6f9fc]"
          }`}
        >
          🏆 Most Points
        </button>
        <button
          onClick={() => setActiveTab("baengos")}
          className={`rounded-lg px-6 py-2 font-semibold transition ${
            activeTab === "baengos"
              ? "bg-gradient-to-r from-[#ff7c24] to-[#ff4f2a] text-white shadow-[0_10px_24px_rgba(255,95,40,0.35)]"
              : "border border-white/15 bg-white/[0.03] text-[#c2cbd6] hover:border-[#ff8a2a]/60 hover:text-[#f6f9fc]"
          }`}
        >
          🎉 Most Baengos
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-[#9ca6b2]">
          Loading leaderboard...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="py-8 text-center text-[#9ca6b2]">No data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/15">
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[#9ca6b2]">
                  Rank
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[#9ca6b2]">
                  Player
                </th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-[#9ca6b2]">
                  {activeTab === "points" ? "Points" : "Baengos"}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr
                  key={entry.userId}
                  className={`border-b border-white/10 transition hover:bg-white/[0.03] ${
                    idx < 3 ? "bg-[#ff7a2c]/10" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-lg">
                      {entry.rank === 1
                        ? "🥇"
                        : entry.rank === 2
                          ? "🥈"
                          : entry.rank === 3
                            ? "🥉"
                            : `${entry.rank}.`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#e7ecf3]">
                    {entry.username}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#ff9a49]">
                    {activeTab === "points" ? entry.points : entry.baengoCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
