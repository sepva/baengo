-- Rename bingo references to baengo (only full cards count as baengos)

-- Rename table
ALTER TABLE bingo_items RENAME TO baengo_items;

-- Rename column in user_scores
ALTER TABLE user_scores RENAME COLUMN bingo_count TO baengo_count;

-- Rename index
DROP INDEX idx_user_scores_bingo_count;
CREATE INDEX idx_user_scores_baengo_count ON user_scores(baengo_count DESC);
