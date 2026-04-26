import { Hono } from "hono";
import { verifyAuth, AuthPayload } from "../middleware/auth";

interface Env {
  DB: D1Database;
}

interface BaengoItem {
  id: number;
  content: string;
  marked: boolean;
}

const grid = new Hono<{ Bindings: Env; Variables: { user: AuthPayload } }>();

// Helper function to get the start of the current week (Sunday) in Brussels timezone.
// Returns a "week-YYYY-MM-DD" string so it never collides with old daily "YYYY-MM-DD" rows.
function getCurrentWeekStart(): string {
  const now = new Date();
  // Convert to Brussels time (CET/CEST)
  const brusselsDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }),
  );
  // dayOfWeek: 0 = Sunday, 1 = Monday, …, 6 = Saturday
  const dayOfWeek = brusselsDate.getDay();
  const sunday = new Date(brusselsDate);
  sunday.setDate(brusselsDate.getDate() - dayOfWeek);
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, "0");
  const day = String(sunday.getDate()).padStart(2, "0");
  return `week-${year}-${month}-${day}`;
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

// Get or generate this week's grid for user
grid.get("/today", verifyAuth, async (c) => {
  try {
    const user = c.get("user") as AuthPayload;
    const db = c.env.DB;
    const currentWeekStart = getCurrentWeekStart();

    // Check if grid exists for this week
    let dailyGrid = (await db
      .prepare("SELECT * FROM daily_grids WHERE user_id = ? AND grid_date = ?")
      .bind(user.userId, currentWeekStart)
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
          "SELECT id, content FROM baengo_items ORDER BY RANDOM() LIMIT 16",
        )
        .all()) as { results: Array<{ id: number; content: string }> };

      if (!items.results || items.results.length < 16) {
        return c.json({ error: "Not enough baengo items in database" }, 500);
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
          currentWeekStart,
          JSON.stringify(gridData),
          new Date().toISOString(),
        )
        .run();

      return c.json({
        gridId: result.meta.last_row_id,
        gridDate: currentWeekStart,
        items: gridData.items,
      });
    }

    // Return existing grid
    const gridData = JSON.parse(dailyGrid.grid_data);
    return c.json({
      gridId: dailyGrid.id,
      gridDate: currentWeekStart,
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
    const currentWeekStart = getCurrentWeekStart();

    // Get current grid
    const dailyGrid = (await db
      .prepare("SELECT * FROM daily_grids WHERE id = ? AND user_id = ?")
      .bind(gridId, user.userId)
      .first()) as
      | { id: number; grid_date: string; grid_data: string }
      | undefined;

    if (!dailyGrid) {
      return c.json({ error: "Grid not found" }, 404);
    }

    // Reject stale grids so weekly rollover cannot affect scoring for a different week.
    if (dailyGrid.grid_date !== currentWeekStart) {
      return c.json(
        { error: "Grid is no longer active. Refresh to get this week's grid." },
        409,
      );
    }

    const gridDate = dailyGrid.grid_date;

    const gridData = JSON.parse(dailyGrid.grid_data);
    const item = gridData.items.find((i: BaengoItem) => i.id === itemId);

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
          .map((it: BaengoItem) => (it.marked ? 1 : 0)),
      );
    }

    let pointsToAdd = 0;
    let baengoCountToAdd = 0;

    if (marked && !oldMarked) {
      // USER IS MARKING AN ITEM
      // Check for completed rows (10 points each, but don't count as baengo)
      for (let i = 0; i < 4; i++) {
        if (isLineComplete(gridArray, i, "row")) {
          // Check if this row was already recorded
          const existing = await db
            .prepare(
              "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
            )
            .bind(user.userId, gridDate, "row", i)
            .first();

          if (!existing) {
            console.log(`Row ${i} completed for user ${user.userId}`);
            pointsToAdd += 10;
            await db
              .prepare(
                "INSERT INTO completed_rows (user_id, grid_date, row_type, row_index, created_at) VALUES (?, ?, ?, ?, ?)",
              )
              .bind(user.userId, gridDate, "row", i, new Date().toISOString())
              .run();
          }
        }
      }

      // Check for completed columns (10 points each, but don't count as baengo)
      for (let i = 0; i < 4; i++) {
        if (isLineComplete(gridArray, i, "col")) {
          const existing = await db
            .prepare(
              "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
            )
            .bind(user.userId, gridDate, "col", i)
            .first();

          if (!existing) {
            console.log(`Column ${i} completed for user ${user.userId}`);
            pointsToAdd += 10;
            await db
              .prepare(
                "INSERT INTO completed_rows (user_id, grid_date, row_type, row_index, created_at) VALUES (?, ?, ?, ?, ?)",
              )
              .bind(user.userId, gridDate, "col", i, new Date().toISOString())
              .run();
          }
        }
      }

      // Check for full card (Baengo!) - 100 points AND counts toward baengo leaderboard
      console.log("Checking full card completion. GridArray:", gridArray);
      if (isFullCardComplete(gridArray)) {
        console.log("Full card detected!");
        const existing = await db
          .prepare(
            "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ?",
          )
          .bind(user.userId, gridDate, "full")
          .first();

        if (!existing) {
          console.log("Recording new baengo!");
          pointsToAdd += 100;
          baengoCountToAdd += 1;
          await db
            .prepare(
              "INSERT INTO completed_rows (user_id, grid_date, row_type, row_index, created_at) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(user.userId, gridDate, "full", -1, new Date().toISOString())
            .run();
        }
      }
    } else if (!marked && oldMarked) {
      // USER IS UNMARKING AN ITEM - check which completions are broken
      let pointsToRemove = 0;
      let baengoCountToRemove = 0;

      // Check all completed rows to see if any are now broken
      for (let i = 0; i < 4; i++) {
        if (!isLineComplete(gridArray, i, "row")) {
          // This row is no longer complete, remove it if it was recorded
          const existing = await db
            .prepare(
              "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
            )
            .bind(user.userId, gridDate, "row", i)
            .first();

          if (existing) {
            console.log(
              `Row ${i} no longer complete for user ${user.userId}, removing 10 points`,
            );
            pointsToRemove += 10;
            await db
              .prepare(
                "DELETE FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
              )
              .bind(user.userId, gridDate, "row", i)
              .run();
          }
        }
      }

      // Check all completed columns to see if any are now broken
      for (let i = 0; i < 4; i++) {
        if (!isLineComplete(gridArray, i, "col")) {
          // This column is no longer complete, remove it if it was recorded
          const existing = await db
            .prepare(
              "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
            )
            .bind(user.userId, gridDate, "col", i)
            .first();

          if (existing) {
            console.log(
              `Column ${i} no longer complete for user ${user.userId}, removing 10 points`,
            );
            pointsToRemove += 10;
            await db
              .prepare(
                "DELETE FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ? AND row_index = ?",
              )
              .bind(user.userId, gridDate, "col", i)
              .run();
          }
        }
      }

      // Check if full card is now broken
      if (!isFullCardComplete(gridArray)) {
        const existing = await db
          .prepare(
            "SELECT id FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ?",
          )
          .bind(user.userId, gridDate, "full")
          .first();

        if (existing) {
          console.log(
            `Full card no longer complete for user ${user.userId}, removing 100 points and 1 baengo`,
          );
          pointsToRemove += 100;
          baengoCountToRemove += 1;
          await db
            .prepare(
              "DELETE FROM completed_rows WHERE user_id = ? AND grid_date = ? AND row_type = ?",
            )
            .bind(user.userId, gridDate, "full")
            .run();
        }
      }

      pointsToAdd = -pointsToRemove;
      baengoCountToAdd = -baengoCountToRemove;
    }

    // Update user scores if points changed
    if (pointsToAdd !== 0 || baengoCountToAdd !== 0) {
      console.log(
        `Updating user ${user.userId} with ${pointsToAdd > 0 ? "+" : ""}${pointsToAdd} points, ${baengoCountToAdd > 0 ? "+" : ""}${baengoCountToAdd} baengos`,
      );
      await db
        .prepare(
          "UPDATE user_scores SET points = points + ?, baengo_count = baengo_count + ?, updated_at = ? WHERE user_id = ?",
        )
        .bind(
          pointsToAdd,
          baengoCountToAdd,
          new Date().toISOString(),
          user.userId,
        )
        .run();
    }

    // Get updated user score
    const userScore = (await db
      .prepare("SELECT points, baengo_count FROM user_scores WHERE user_id = ?")
      .bind(user.userId)
      .first()) as { points: number; baengo_count: number };

    console.log(
      `User ${user.userId} final score: ${userScore.points} points, ${userScore.baengo_count} baengos`,
    );

    return c.json({
      success: true,
      items: gridData.items,
      pointsAdded: pointsToAdd,
      currentPoints: userScore.points,
      currentBaengoCount: userScore.baengo_count,
      isFullCard: isFullCardComplete(gridArray),
    });
  } catch (err) {
    console.error("Mark error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default grid;
