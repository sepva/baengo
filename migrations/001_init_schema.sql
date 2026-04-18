-- Initial schema for Baengo

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Bingo items table
CREATE TABLE IF NOT EXISTS baengo_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  category TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Daily grids table (stores the grid state for each user per day)
CREATE TABLE IF NOT EXISTS daily_grids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  grid_date TEXT NOT NULL,
  grid_data TEXT NOT NULL, -- JSON with array of items and their marked state
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, grid_date)
);

-- User scores table (cumulative points and baengo count)
CREATE TABLE IF NOT EXISTS user_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  baengo_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Completed rows/columns/full cards table (tracks which lines have been completed)
CREATE TABLE IF NOT EXISTS completed_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  grid_date TEXT NOT NULL,
  row_type TEXT NOT NULL, -- 'row', 'col', or 'full'
  row_index INTEGER, -- 0-3 for rows/cols, -1 for full card
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, grid_date, row_type, row_index)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_grids_user_date ON daily_grids(user_id, grid_date);
CREATE INDEX IF NOT EXISTS idx_completed_rows_user_date ON completed_rows(user_id, grid_date);
CREATE INDEX IF NOT EXISTS idx_user_scores_points ON user_scores(points DESC);
CREATE INDEX IF NOT EXISTS idx_user_scores_baengo_count ON user_scores(baengo_count DESC);
