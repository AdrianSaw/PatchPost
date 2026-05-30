import { z } from "zod";

export const classificationCategorySchema = z.enum([
  "bugfix",
  "gameplay",
  "balance",
  "ui_ux",
  "art_audio",
  "content",
  "technical",
  "unknown",
]);

export const classificationVisibilitySchema = z.enum(["player_facing", "internal", "unclear"]);

export const classificationItemSchema = z.object({
  source: z.string().trim().min(1),
  classification: classificationCategorySchema,
  visibility: classificationVisibilitySchema,
  reason: z.string().trim().min(1),
  suggested_public_summary: z.string().trim().min(1),
});

export const classificationResultSchema = z.object({
  items: z.array(classificationItemSchema).min(1).max(50),
});

export type ClassificationCategory = z.infer<typeof classificationCategorySchema>;
export type ClassificationVisibility = z.infer<typeof classificationVisibilitySchema>;
export type ClassificationItem = z.infer<typeof classificationItemSchema>;
export type ClassificationResult = z.infer<typeof classificationResultSchema>;
