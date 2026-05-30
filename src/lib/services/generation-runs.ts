import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { CreateGenerationRunInput, GenerationRun, UpdateGenerationRunInput } from "@/types";
import { createGenerationRunSchema, updateGenerationRunSchema } from "@/types";

function validationError(error: z.ZodError): PostgrestError {
  return {
    name: "ValidationError",
    message: error.issues.map((issue) => issue.message).join("; "),
    details: "",
    hint: "",
    code: "validation_error",
  };
}

export async function listGenerationRunsByProject(supabase: SupabaseClient, projectId: string) {
  return supabase
    .from("generation_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function getGenerationRunById(supabase: SupabaseClient, generationRunId: string) {
  return supabase.from("generation_runs").select("*").eq("id", generationRunId).maybeSingle();
}

export async function createGenerationRun(
  supabase: SupabaseClient,
  createdBy: string,
  input: CreateGenerationRunInput,
): Promise<{ data: GenerationRun | null; error: PostgrestError | null }> {
  const parsed = createGenerationRunSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  return supabase
    .from("generation_runs")
    .insert({
      project_id: parsed.data.project_id,
      change_input_id: parsed.data.change_input_id ?? null,
      created_by: createdBy,
      output_type: parsed.data.output_type ?? null,
      tone: parsed.data.tone ?? null,
      status: parsed.data.status ?? null,
      prompt_snapshot: parsed.data.prompt_snapshot ?? null,
    })
    .select()
    .single();
}

export async function updateGenerationRun(
  supabase: SupabaseClient,
  generationRunId: string,
  input: UpdateGenerationRunInput,
): Promise<{ data: GenerationRun | null; error: PostgrestError | null }> {
  const parsed = updateGenerationRunSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  return supabase.from("generation_runs").update(parsed.data).eq("id", generationRunId).select().single();
}

export async function deleteGenerationRun(supabase: SupabaseClient, generationRunId: string) {
  return supabase.from("generation_runs").delete().eq("id", generationRunId);
}
