import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateGeneratedOutputInput,
  DefaultTone,
  GeneratedOutput,
  OutputType,
  UpdateGeneratedOutputInput,
} from "@/types";
import { createGeneratedOutputSchema, updateGeneratedOutputSchema } from "@/types";
import { relationMismatchPostgrestError, validationPostgrestError } from "@/lib/services/postgrest-error";

export interface ProjectDraftHistoryItem {
  draft: GeneratedOutputListRow;
  output_type: OutputType | null;
  tone: DefaultTone | null;
}

export type GeneratedOutputListRow = Pick<
  GeneratedOutput,
  "id" | "project_id" | "generation_run_id" | "title" | "content" | "edited_content" | "created_at"
>;

const PROJECT_DRAFT_HISTORY_LIMIT = 50;

const DRAFT_HISTORY_LIST_COLUMNS =
  "id, project_id, generation_run_id, title, content, edited_content, created_at" as const;

interface DraftHistoryQueryRow extends GeneratedOutputListRow {
  generation_runs: { output_type: OutputType | null; tone: DefaultTone | null } | null;
}

async function assertGenerationRunBelongsToProject(
  supabase: SupabaseClient,
  generationRunId: string,
  projectId: string,
): Promise<PostgrestError | null> {
  const { data, error } = await supabase
    .from("generation_runs")
    .select("project_id")
    .eq("id", generationRunId)
    .maybeSingle();
  if (error) {
    return error;
  }
  if (data?.project_id !== projectId) {
    return relationMismatchPostgrestError("generation_run_id");
  }
  return null;
}

export async function listGeneratedOutputsByProject(supabase: SupabaseClient, projectId: string) {
  return supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function listProjectDraftHistory(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ data: ProjectDraftHistoryItem[] | null; error: PostgrestError | null; truncated: boolean }> {
  const { data, error } = await supabase
    .from("generated_outputs")
    .select(`${DRAFT_HISTORY_LIST_COLUMNS}, generation_runs ( output_type, tone )`)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(PROJECT_DRAFT_HISTORY_LIMIT);

  if (error) {
    return { data: null, error, truncated: false };
  }

  const items = (data as unknown as DraftHistoryQueryRow[] | null)?.map((row) => {
    const { generation_runs: run, ...draft } = row;
    return {
      draft,
      output_type: run?.output_type ?? null,
      tone: run?.tone ?? null,
    } satisfies ProjectDraftHistoryItem;
  });

  const rows = items ?? [];
  return {
    data: rows,
    error: null,
    truncated: rows.length === PROJECT_DRAFT_HISTORY_LIMIT,
  };
}

export async function getGeneratedOutputById(
  supabase: SupabaseClient,
  generatedOutputId: string,
): Promise<{ data: GeneratedOutput | null; error: PostgrestError | null }> {
  return supabase.from("generated_outputs").select("*").eq("id", generatedOutputId).maybeSingle();
}

export async function createGeneratedOutput(
  supabase: SupabaseClient,
  input: CreateGeneratedOutputInput,
): Promise<{ data: GeneratedOutput | null; error: PostgrestError | null }> {
  const parsed = createGeneratedOutputSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: validationPostgrestError(parsed.error) };
  }

  if (parsed.data.generation_run_id) {
    const fkError = await assertGenerationRunBelongsToProject(
      supabase,
      parsed.data.generation_run_id,
      parsed.data.project_id,
    );
    if (fkError) {
      return { data: null, error: fkError };
    }
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
    return { data: null, error: validationPostgrestError(parsed.error) };
  }

  if (parsed.data.generation_run_id) {
    const { data: output, error: outputError } = await supabase
      .from("generated_outputs")
      .select("project_id")
      .eq("id", generatedOutputId)
      .maybeSingle();
    if (outputError) {
      return { data: null, error: outputError };
    }
    if (!output) {
      return { data: null, error: relationMismatchPostgrestError("generated_output_id") };
    }
    const fkError = await assertGenerationRunBelongsToProject(
      supabase,
      parsed.data.generation_run_id,
      output.project_id as string,
    );
    if (fkError) {
      return { data: null, error: fkError };
    }
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
