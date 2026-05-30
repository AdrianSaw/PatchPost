import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { CreateProjectInput, Project, UpdateProjectInput } from "@/types";
import { createProjectSchema, updateProjectSchema } from "@/types";

function validationError(error: z.ZodError): PostgrestError {
  return {
    name: "ValidationError",
    message: error.issues.map((issue) => issue.message).join("; "),
    details: "",
    hint: "",
    code: "validation_error",
  };
}

export async function listProjects(supabase: SupabaseClient) {
  return supabase.from("projects").select("*").order("created_at", { ascending: false });
}

export async function getProjectById(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ data: Project | null; error: PostgrestError | null }> {
  return supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
}

export async function createProject(
  supabase: SupabaseClient,
  ownerId: string,
  input: CreateProjectInput,
): Promise<{ data: Project | null; error: PostgrestError | null }> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  return supabase
    .from("projects")
    .insert({
      owner_id: ownerId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      repo_url: parsed.data.repo_url ?? null,
      default_tone: parsed.data.default_tone ?? null,
    })
    .select()
    .single();
}

export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  input: UpdateProjectInput,
): Promise<{ data: Project | null; error: PostgrestError | null }> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationError(parsed.error) };
  }

  return supabase.from("projects").update(parsed.data).eq("id", projectId).select().single();
}

export async function deleteProject(supabase: SupabaseClient, projectId: string) {
  return supabase.from("projects").delete().eq("id", projectId);
}
