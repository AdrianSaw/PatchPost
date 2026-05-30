import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { CreateGeneratedOutputInput, GeneratedOutput, UpdateGeneratedOutputInput } from "@/types";
import { createGeneratedOutputSchema, updateGeneratedOutputSchema } from "@/types";

function validationError(error: z.ZodError): PostgrestError {
  return {
    name: "ValidationError",
    message: error.issues.map((issue) => issue.message).join("; "),
    details: "",
    hint: "",
    code: "validation_error",
  };
}

export async function listGeneratedOutputsByProject(supabase: SupabaseClient, projectId: string) {
  return supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function getGeneratedOutputById(supabase: SupabaseClient, generatedOutputId: string) {
  return supabase.from("generated_outputs").select("*").eq("id", generatedOutputId).maybeSingle();
}

export async function createGeneratedOutput(
  supabase: SupabaseClient,
  input: CreateGeneratedOutputInput,
): Promise<{ data: GeneratedOutput | null; error: PostgrestError | null }> {
  const parsed = createGeneratedOutputSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  return supabase
    .from("generated_outputs")
    .insert({
      project_id: parsed.data.project_id,
      generation_run_id: parsed.data.generation_run_id ?? null,
      title: parsed.data.title ?? null,
      content: parsed.data.content,
      edited_content: parsed.data.edited_content ?? null,
      status: parsed.data.status ?? null,
    })
    .select()
    .single();
}

export async function updateGeneratedOutput(
  supabase: SupabaseClient,
  generatedOutputId: string,
  input: UpdateGeneratedOutputInput,
): Promise<{ data: GeneratedOutput | null; error: PostgrestError | null }> {
  const parsed = updateGeneratedOutputSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  const payload = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  return supabase.from("generated_outputs").update(payload).eq("id", generatedOutputId).select().single();
}

export async function deleteGeneratedOutput(supabase: SupabaseClient, generatedOutputId: string) {
  return supabase.from("generated_outputs").delete().eq("id", generatedOutputId);
}
