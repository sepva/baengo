-- Add password reset token columns to users
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
