-- Store user-submitted baengo item ideas for manual review
CREATE TABLE IF NOT EXISTS baengo_item_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_baengo_item_suggestions_status ON baengo_item_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_baengo_item_suggestions_created_at ON baengo_item_suggestions(created_at DESC);
