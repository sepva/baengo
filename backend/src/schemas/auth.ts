import { z } from "zod";

// Username: 3-20 chars, alphanumeric + underscore only, no SQL keywords
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const SQL_KEYWORDS = [
  "select",
  "insert",
  "update",
  "delete",
  "drop",
  "create",
  "alter",
  "exec",
  "union",
];

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    USERNAME_PATTERN,
    "Username can only contain letters, numbers, and underscores",
  )
  .refine(
    (val) => !SQL_KEYWORDS.includes(val.toLowerCase()),
    "This username is reserved",
  );

// Password: 8+ chars, min 1 uppercase, 1 digit, 1 special char
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character",
  );

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
