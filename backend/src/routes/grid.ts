import { Hono } from "hono";
import { verifyAuth, AuthPayload } from "../middleware/auth";

interface Env {
  DB: D1Database;
}

interface BingoItem {
  id: number;
  content: string;
  marked: boolean;
}

const grid = new Hono<{ Bindings: Env; Variables: { user: AuthPayload } }>();

// Helper function to get today's date in Brussels timezone
function getTodayBrussels(): string {
  const now = new Date();
  // Convert to Brussels time (CET/CEST)
  const brusselsDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }),
  );
  return brusselsDate.toISOString().split("T")[0];
}

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper function to check if a row or column is complete
function isLineComplete(
  grid: number[][],
  lineIndex: number,
  lineType: "row" | "col",
): boolean {
  if (lineType === "row") {
    return grid[lineIndex].every((val) => val === 1);
  } else {
    return grid.every((row) => row[lineIndex] === 1);
  }
}

// Helper function to check if full card is complete
function isFullCardComplete(grid: number[][]): boolean {
  return grid.every((row) => row.every((val) => val === 1));
}

// Get or generate today's grid for user
grid.get("/today", verifyAuth, async (c) => {
  try {
    const user = c.get("user") as AuthPayload;
    const db = c.env.DB;
    const today = getTodayBrussels();

    // Check if grid exists for today
    let dailyGrid = (await db
      .prepare("SELECT * FROM daily_grids WHERE user_id = ? AND grid_date = ?")
      .bind(user.userId, today)
      .first()) as
      | {
          id: number;
          user_id: number;
          grid_date: string;
          grid_data: string;
          created_at: string;
        }
      | undefined;

    if (!dailyGrid) {
      // Generate new grid
      const items = (await db
        .prepare(
          "SELECT id, content FROM bingo_items ORDER BY RANDOM() LIMIT 16",
        )
        .all()) as { results: Array<{ id: number; content: string }> };

      if (!items.results || items.results.length < 16) {
        return c.json({ error: "Not enough bingo items in database" }, 500);
      }

      const selectedItems = items.results;
      const gridData = {
        items: selectedItems.map((item) => ({
          id: item.id,
          content: item.content,
          marked: false,
        })),
        createdAt: new Date().toISOString(),
      };

      const result = await db
        .prepare(
          "INSERT INTO daily_grids (user_id, grid_date, grid_data, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(
          user.userId,
          today,
          JSON.stringify(gridData),
          new Date().toISOString(),
        )
        .run();

      return c.json({
        gridId: result.meta.last_row_id,
        gridDate: today,
        items: gridData.items,
      });
    }

    // Return existing grid
    const gridData = JSON.parse(dailyGrid.grid_data);
    return c.json({
      gridId: dailyGrid.id,
      gridDate: today,
      items: gridData.items,
    });
  } catch (err) {
    console.error("Get grid error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Mark/unmark item
grid.patch("/mark", verifyAuth, async (c) => {
  try {
    const user = c.get("user") as AuthPayload;
    const { gridId, itemId, marked } = await c.req.json();
    const db = c.env.DB;
    const today = getTodayBrussels();

    // Get current grid
    const dailyGrid = (await db
      .prepare("SELECT * FROM daily_grids WHERE id = ? AND user_id = ?")
      .bind(gridId, user.userId)
      .first()) as { id: number; grid_data: string } | undefined;

    if (!dailyGrid) {
      return c.json({ error: "Grid not found" }, 404);
    }

    const gridData = JSON.parse(dailyGrid.grid_data);
    const item = gridData.items.find((i: BingoItem) => i.id === itemId);

    if (!item) {
      return c.json({ error: "Item not found in grid" }, 404);
    }

    const oldMarked = item.marked;
    item.marked = marked;

    // Update grid
    await db
      .prepare("UPDATE daily_grids SET grid_data = ? WHERE id = ?")
      .bind(JSON.stringify(gridData), gridId)
      .run();

    // Check for completed lines and update scores
    const gridArray = [];
    for (let i = 0; i < 4; i++) {
      gridArray.push(
        gridData.items
          .slice(i * 4, (i + 1) * 4)
          .map((it: BingoItem) => (it.marked ? 1 : 0)),
      );
    }

    let pointsToAdd = 0;
    let bingoCountToAdd = 0;

    if (marked && !oldMarked) {
      // Check for completed rows
      for (let i = 0; i < 4; i++) {
        if (isLineComplete(gridArray, i, "row")) {
          // Check if this bingo was already recorded
          const existing = await db
            .prepare(
              "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
            )
            .bind(user.userId, today, "row", i)
            .first();

          if (!existing) {
            pointsToAdd += 10;
            bingoCountToAdd += 1;
            await db
              .prepare(
                "INSERT INTO completed_rows (user_id, grid_date, row_type, row_index, created_at) VALUES (?, ?, ?, ?, ?)",
              )
              .bind(user.userId, today, "row", i, new Date().toISOString())
              .run();
          }
        }
      }

      // Check for completed columns
      for (let i = 0; i < 4; i++) {
        if (isLineComplete(gridArray, i, "col")) {
          const existing = await db
            .prepare(
              "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
            )
            .bind(user.userId, today, "col", i)
            .first();

          if (!existing) {
            pointsToAdd += 10;
            bingoCountToAdd += 1;
            await db
              .prepare(
                "INSERT INTO completed_rows (user_id, grid_date, row_type, row_index, created_at) VALUES (?, ?, ?, ?, ?)",
              )
              .bind(user.userId, today, "col", i, new Date().toISOString())
              .run();
          }
        }
      }

      // Check for full card (Baengo!)
      if (isFullCardComplete(gridArray)) {
        const existing = await db
          .prepare(
            "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ?",
          )
          .bind(user.userId, today, "full")
          .first();

        if (!existing) {
          pointsToAdd += 100;
          bingoCountToAdd += 1;
          await db
            .prepare(
              "INSERT INTO completed_rows (user_id, grid_date, row_type, row_index, created_at) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(user.userId, today, "full", -1, new Date().toISOString())
            .run();
        }
      }

      // Update user scores if points were added
      if (pointsToAdd > 0) {
        await db
          .prepare(
            "UPDATE user_scores SET points = points + ?, bingo_count = bingo_count + ?, updated_at = ? WHERE user_id = ?",
          )
          .bind(
            pointsToAdd,
            bingoCountToAdd,
            new Date().toISOString(),
            user.userId,
          )
          .run();
      }
    }

    // Get updated user score
    const userScore = (await db
      .prepare("SELECT points, bingo_count FROM user_scores WHERE user_id = ?")
      .bind(user.userId)
      .first()) as { points: number; bingo_count: number };

    return c.json({
      success: true,
      items: gridData.items,
      pointsAdded: pointsToAdd,
      currentPoints: userScore.points,
      currentBingoCount: userScore.bingo_count,
      isFullCard: isFullCardComplete(gridArray),
    });
  } catch (err) {
    console.error("Mark error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default grid;
