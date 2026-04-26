import { z } from "zod";

export const createSuggestionSchema = z.object({
  content: z
    .string()
    .trim()
    .min(4, "Suggestion must be at least 4 characters")
    .max(140, "Suggestion must be at most 140 characters"),
});

export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>;
