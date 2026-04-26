import { Hono } from "hono";
import { verifyAuth, AuthPayload } from "../middleware/auth";
import { createSuggestionSchema } from "../schemas/suggestions";

interface Env {
  DB: D1Database;
}

const suggestions = new Hono<{
  Bindings: Env;
  Variables: { user: AuthPayload };
}>();

suggestions.post("/", verifyAuth, async (c) => {
  try {
    const user = c.get("user") as AuthPayload;
    const body = await c.req.json();
    const validated = createSuggestionSchema.parse(body);

    const content = validated.content.trim();
    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(
      "INSERT INTO baengo_item_suggestions (user_id, content, status, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(user.userId, content, "pending", now)
      .run();

    return c.json(
      {
        message: "Suggestion received. Thanks!",
        suggestionId: result.meta.last_row_id,
      },
      201,
    );
  } catch (err) {
    throw err;
  }
});

export default suggestions;
