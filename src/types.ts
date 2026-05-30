import { z } from "zod";

export const sourceTypeSchema = z.literal("manual");
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const outputTypeSchema = z.enum([
  "changelog",
  "instagram_post",
  "discord_update",
  "steam_news",
  "devlog_summary",
]);
export type OutputType = z.infer<typeof outputTypeSchema>;

export const generationRunStatusSchema = z.enum(["draft", "accepted", "archived", "failed"]);
export type GenerationRunStatus = z.infer<typeof generationRunStatusSchema>;

export const defaultToneSchema = z.enum(["professional", "friendly", "hype", "indie_devlog", "technical"]);
export type DefaultTone = z.infer<typeof defaultToneSchema>;

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  repo_url: string | null;
  default_tone: DefaultTone | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeInput {
  id: string;
  project_id: string;
  source_type: SourceType;
  title: string | null;
  raw_content: string;
  created_by: string;
  created_at: string;
}

export interface GenerationRun {
  id: string;
  project_id: string;
  change_input_id: string | null;
  created_by: string;
  output_type: OutputType | null;
  tone: DefaultTone | null;
  status: GenerationRunStatus | null;
  prompt_snapshot: string | null;
  created_at: string;
}

export interface GeneratedOutput {
  id: string;
  generation_run_id: string | null;
  project_id: string;
  title: string | null;
  content: string;
  edited_content: string | null;
  status: GenerationRunStatus | null;
  created_at: string;
  updated_at: string;
}

export const createProjectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  repo_url: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.url().optional().nullable(),
  ),
  default_tone: defaultToneSchema.optional().nullable(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required",
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const createChangeInputSchema = z.object({
  project_id: z.uuid(),
  title: z.string().trim().optional().nullable(),
  raw_content: z.string().trim().min(1),
});
export type CreateChangeInputInput = z.infer<typeof createChangeInputSchema>;

export const updateChangeInputSchema = z
  .object({
    title: z.string().trim().optional().nullable(),
    raw_content: z.string().trim().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
export type UpdateChangeInputInput = z.infer<typeof updateChangeInputSchema>;

export const createGenerationRunSchema = z.object({
  project_id: z.uuid(),
  change_input_id: z.uuid().optional().nullable(),
  output_type: outputTypeSchema.optional().nullable(),
  tone: defaultToneSchema.optional().nullable(),
  status: generationRunStatusSchema.optional().nullable(),
  prompt_snapshot: z.string().optional().nullable(),
});
export type CreateGenerationRunInput = z.infer<typeof createGenerationRunSchema>;

export const updateGenerationRunSchema = z
  .object({
    change_input_id: z.uuid().optional().nullable(),
    output_type: outputTypeSchema.optional().nullable(),
    tone: defaultToneSchema.optional().nullable(),
    status: generationRunStatusSchema.optional().nullable(),
    prompt_snapshot: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
export type UpdateGenerationRunInput = z.infer<typeof updateGenerationRunSchema>;

export const createGeneratedOutputSchema = z.object({
  project_id: z.uuid(),
  generation_run_id: z.uuid().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  content: z.string().trim().min(1),
  edited_content: z.string().trim().optional().nullable(),
  status: generationRunStatusSchema.optional().nullable(),
});
export type CreateGeneratedOutputInput = z.infer<typeof createGeneratedOutputSchema>;

export const updateGeneratedOutputSchema = z
  .object({
    generation_run_id: z.uuid().optional().nullable(),
    title: z.string().trim().optional().nullable(),
    content: z.string().trim().min(1).optional(),
    edited_content: z.string().trim().optional().nullable(),
    status: generationRunStatusSchema.optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
export type UpdateGeneratedOutputInput = z.infer<typeof updateGeneratedOutputSchema>;
