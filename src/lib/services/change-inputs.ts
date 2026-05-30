import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { ChangeInput, CreateChangeInputInput, UpdateChangeInputInput } from "@/types";
import { createChangeInputSchema, updateChangeInputSchema } from "@/types";

function validationError(error: z.ZodError): PostgrestError {
  return {
    name: "ValidationError",
    message: error.issues.map((issue) => issue.message).join("; "),
    details: "",
    hint: "",
    code: "validation_error",
  };
}

export async function listChangeInputsByProject(supabase: SupabaseClient, projectId: string) {
  return supabase
    .from("change_inputs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function getChangeInputById(
  supabase: SupabaseClient,
  changeInputId: string,
): Promise<{ data: ChangeInput | null; error: PostgrestError | null }> {
  return supabase.from("change_inputs").select("*").eq("id", changeInputId).maybeSingle();
}

export async function createChangeInput(
  supabase: SupabaseClient,
  createdBy: string,
  input: CreateChangeInputInput,
): Promise<{ data: ChangeInput | null; error: PostgrestError | null }> {
  const parsed = createChangeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  return supabase
    .from("change_inputs")
    .insert({
      project_id: parsed.data.project_id,
      source_type: "manual",
      title: parsed.data.title ?? null,
      raw_content: parsed.data.raw_content,
      created_by: createdBy,
    })
    .select()
    .single();
}

export async function updateChangeInput(
  supabase: SupabaseClient,
  changeInputId: string,
  input: UpdateChangeInputInput,
): Promise<{ data: ChangeInput | null; error: PostgrestError | null }> {
  const parsed = updateChangeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  return supabase.from("change_inputs").update(parsed.data).eq("id", changeInputId).select().single();
}

export async function deleteChangeInput(supabase: SupabaseClient, changeInputId: string) {
  return supabase.from("change_inputs").delete().eq("id", changeInputId);
}
