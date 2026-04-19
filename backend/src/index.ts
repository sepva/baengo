import { Hono } from "hono";
import { cors } from "hono/cors";
import authRoutes from "./routes/auth";
import gridRoutes from "./routes/grid";
import leaderboardRoutes from "./routes/leaderboard";
import { AuthPayload } from "./middleware/auth";
import { securityHeaders } from "./middleware/security-headers";
import { mapErrorToResponse } from "./utils/error-mapper";

export interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
}

const app = new Hono<{ Bindings: Env; Variables: { user: AuthPayload } }>();

// Validate JWT_SECRET at startup
function validateEnv(env: Env) {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  if (env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
}

// Determine allowed origins based on environment
function getAllowedOrigins(env: Env): string[] {
  if (env.ENVIRONMENT === "production") {
    return ["https://baengo.melios.be"];
  }
  // Development
  return [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
  ];
}

// CORS middleware with origin validation
function corsMiddleware(env: Env) {
  const allowedOrigins = getAllowedOrigins(env);

  return cors({
    origin: (origin) => {
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  });
}

// Security headers middleware
app.use("*", securityHeaders);

// CORS middleware (will be applied per environment)
app.use("*", async (c, next) => {
  const corsHandler = corsMiddleware(c.env);
  return corsHandler(c, next);
});

// Health check
app.get("/", (c) => {
  return c.json({ message: "Baengo API is running", version: "1.0.0" });
});

// Validate environment on first request to any route
app.use("*", async (c, next) => {
  try {
    validateEnv(c.env);
    await next();
  } catch (err) {
    if (err instanceof Error && err.message.includes("JWT_SECRET")) {
      return c.json(
        {
          error: "Server Configuration Error",
          message: "Server is not properly configured",
        },
        500,
      );
    }
    throw err;
  }
});

// API routes
app.route("/api/auth", authRoutes);
app.route("/api/grid", gridRoutes);
app.route("/api/leaderboard", leaderboardRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    { error: "Not Found", message: "The requested endpoint does not exist" },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  const { statusCode, response } = mapErrorToResponse(err);
  return c.json(response, statusCode as any);
});

export default app;
