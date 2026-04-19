import { Hono } from "hono";
import bcrypt from "bcryptjs";
import {
  generateToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../schemas/auth";
import {
  ValidationError,
  AuthError,
  ConflictError,
  RateLimitError,
} from "../utils/error-mapper";
import { createRateLimiter } from "../middleware/rate-limit";

interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET: string;
}

const auth = new Hono<{ Bindings: Env }>();

// Rate limiting: 5 requests per 10 minutes for registration
const registerRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
  keyPrefix: "register",
});

// Rate limiting: 10 requests per 15 minutes for login
const loginRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "login",
});

// Register endpoint
auth.post("/register", registerRateLimiter, async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validated = registerSchema.parse(body);

    const db = c.env.DB;

    // Check if user already exists
    const existing = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(validated.username)
      .first();
    if (existing) {
      throw new ConflictError("Registration failed, please try again");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Create user
    const result = await db
      .prepare(
        "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
      )
      .bind(validated.username, hashedPassword, new Date().toISOString())
      .run();

    const userId = result.meta.last_row_id as number;

    // Generate access and refresh tokens
    const accessToken = generateToken(
      userId,
      validated.username,
      c.env.JWT_SECRET,
    );
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry();

    // Store refresh token in DB
    await db
      .prepare(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      )
      .bind(userId, refreshToken, refreshTokenExpiry)
      .run();

    // Initialize user scores
    await db
      .prepare(
        "INSERT INTO user_scores (user_id, points, baengo_count, updated_at) VALUES (?, ?, ?, ?)",
      )
      .bind(userId, 0, 0, new Date().toISOString())
      .run();

    return c.json(
      {
        message: "User registered successfully",
        accessToken,
        refreshToken,
        userId,
        username: validated.username,
      },
      201,
    );
  } catch (err) {
    throw err;
  }
});

// Login endpoint
auth.post("/login", loginRateLimiter, async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validated = loginSchema.parse(body);

    const db = c.env.DB;

    // Find user with lockout info
    const user = (await db
      .prepare(
        "SELECT id, username, password_hash, locked_until, failed_login_attempts FROM users WHERE username = ?",
      )
      .bind(validated.username)
      .first()) as
      | {
          id: number;
          username: string;
          password_hash: string;
          locked_until: string | null;
          failed_login_attempts: number;
        }
      | undefined;

    if (!user) {
      // Don't reveal whether username exists (prevents username enumeration)
      throw new AuthError("Invalid credentials");
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > new Date()) {
        const waitSeconds = Math.ceil(
          (lockedUntil.getTime() - Date.now()) / 1000,
        );
        throw new RateLimitError(
          `Account temporarily locked. Try again in ${waitSeconds} seconds.`,
        );
      }
      // Lock period expired, reset
      await db
        .prepare(
          "UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?",
        )
        .bind(user.id)
        .run();
      user.locked_until = null;
      user.failed_login_attempts = 0;
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(
      validated.password,
      user.password_hash,
    );
    if (!passwordMatch) {
      // Increment failed attempts
      const newFailedAttempts = user.failed_login_attempts + 1;
      let lockedUntilValue = null;

      if (newFailedAttempts >= 5) {
        // Lock account for 30 minutes
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        lockedUntilValue = lockUntil.toISOString();
      }

      await db
        .prepare(
          "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
        )
        .bind(newFailedAttempts, lockedUntilValue, user.id)
        .run();

      // If just locked, return 429
      if (lockedUntilValue) {
        throw new RateLimitError(
          "Too many failed login attempts. Account locked for 30 minutes.",
        );
      }

      // Same error message as user not found (prevents enumeration)
      throw new AuthError("Invalid credentials");
    }

    // Login successful - reset failed attempts and generate tokens
    const accessToken = generateToken(user.id, user.username, c.env.JWT_SECRET);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry();

    // Store refresh token in DB
    await db
      .prepare(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      )
      .bind(user.id, refreshToken, refreshTokenExpiry)
      .run();

    // Reset failed login attempts
    await db
      .prepare(
        "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
      )
      .bind(user.id)
      .run();

    return c.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      userId: user.id,
      username: user.username,
    });
  } catch (err) {
    throw err;
  }
});

// Refresh token endpoint
auth.post("/refresh", async (c) => {
  try {
    const body = await c.req.json();

    // Validate refresh token
    const validated = refreshTokenSchema.parse(body);

    const db = c.env.DB;

    // Find refresh token in DB
    const storedToken = (await db
      .prepare("SELECT user_id, expires_at FROM refresh_tokens WHERE token = ?")
      .bind(validated.refreshToken)
      .first()) as { user_id: number; expires_at: string } | undefined;

    if (!storedToken) {
      throw new AuthError("Invalid refresh token");
    }

    // Check if token is expired
    const expiryDate = new Date(storedToken.expires_at);
    if (expiryDate < new Date()) {
      // Delete expired token
      await db
        .prepare("DELETE FROM refresh_tokens WHERE token = ?")
        .bind(validated.refreshToken)
        .run();
      throw new AuthError("Refresh token expired");
    }

    // Get user info
    const user = (await db
      .prepare("SELECT username FROM users WHERE id = ?")
      .bind(storedToken.user_id)
      .first()) as { username: string } | undefined;

    if (!user) {
      throw new AuthError("User not found");
    }

    // Generate new tokens
    const newAccessToken = generateToken(
      storedToken.user_id,
      user.username,
      c.env.JWT_SECRET,
    );
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenExpiry = getRefreshTokenExpiry();

    // Delete old refresh token and insert new one
    await db
      .prepare("DELETE FROM refresh_tokens WHERE token = ?")
      .bind(validated.refreshToken)
      .run();

    await db
      .prepare(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      )
      .bind(storedToken.user_id, newRefreshToken, newRefreshTokenExpiry)
      .run();

    return c.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      userId: storedToken.user_id,
      username: user.username,
    });
  } catch (err) {
    throw err;
  }
});

// Logout endpoint (client-side token removal, but useful for API validation)
auth.post("/logout", (c) => {
  return c.json({ message: "Logged out successfully" });
});

export default auth;
