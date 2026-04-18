import { useState, useEffect } from "react";
import { gridApi } from "../api/client";

interface BingoItem {
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
  const [items, setItems] = useState<BingoItem[]>([]);
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

  const handleItemClick = async (item: BingoItem) => {
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
        <div className="text-gray-500">Loading your bingo card...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Celebration overlay */}
      {celebrating && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 pointer-events-none">
          <div className="text-center">
            <div className="text-8xl font-bold text-white animate-pulse mb-4">
              BAENGO! 🎉
            </div>
            <div className="text-4xl text-yellow-300 animate-bounce">
              +100 POINTS!
            </div>
          </div>
        </div>
      )}

      {/* Bingo Grid */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
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
                    ? "bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-purple-400"
                }
              `}
            >
              <span className="block line-clamp-3 text-xs md:text-sm">
                {item.content}
              </span>
              {item.marked && <span className="text-2xl mt-1">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
