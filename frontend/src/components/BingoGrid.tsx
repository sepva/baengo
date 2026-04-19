import { useState, useEffect } from "react";
import { gridApi } from "../api/client";

interface BaengoItem {
  id: number;
  content: string;
  marked: boolean;
}

interface BingoGridProps {
  onBaengo?: (points: number) => void;
  onPointsAdded?: (points: number) => void;
}

export default function BingoGrid({ onBaengo, onPointsAdded }: BingoGridProps) {
  const [gridId, setGridId] = useState<number | null>(null);
  const [items, setItems] = useState<BaengoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    loadGrid();
  }, []);

  const loadGrid = async () => {
    try {
      const response = await gridApi.getToday();
      setGridId(response.data.gridId);
      setItems(response.data.items);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load grid:", error);
      setLoading(false);
    }
  };

  const handleItemClick = async (item: BaengoItem) => {
    if (!gridId) return;

    try {
      const newMarked = !item.marked;
      const response = await gridApi.markItem(gridId, item.id, newMarked);

      // Update local state
      setItems(response.data.items);

      // Handle points
      if (response.data.pointsAdded > 0) {
        onPointsAdded?.(response.data.pointsAdded);

        // Trigger Baengo celebration if full card
        if (response.data.isFullCard) {
          setCelebrating(true);
          onBaengo?.(response.data.pointsAdded);
          setTimeout(() => setCelebrating(false), 3000);
        }
      }
    } catch (error) {
      console.error("Failed to mark item:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#9ca6b2]">Loading your baengo card...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Celebration overlay */}
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <div className="text-center">
            <div className="mb-4 text-8xl font-extrabold tracking-tight text-[#ff8a2a] animate-pulse">
              BAENGO! 🎉
            </div>
            <div className="text-4xl font-bold text-[#ffe2c7] animate-bounce">
              +100 POINTS!
            </div>
          </div>
        </div>
      )}

      {/* Bingo Grid */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-white/[0.02] p-8 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <h2 className="mb-6 text-2xl font-bold text-[#f4f7fb]">
          Your Daily Bingo Card
        </h2>

        <div className="grid grid-cols-4 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`
                aspect-square p-4 rounded-lg font-medium text-sm text-center
                transition-all duration-300 transform hover:scale-105
                ${
                  item.marked
                    ? "scale-105 border border-[#ff9e5a]/55 bg-gradient-to-br from-[#ff812f] to-[#ff4f2a] text-white shadow-[0_12px_26px_rgba(255,94,35,0.35)]"
                    : "border-2 border-white/12 bg-[#1a2029] text-[#d5dde7] hover:border-[#ff8a2a]/70 hover:bg-[#212936]"
                }
              `}
            >
              <span className="block line-clamp-3 text-xs leading-snug md:text-sm">
                {item.content}
              </span>
              {item.marked && <span className="mt-1 text-2xl">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
