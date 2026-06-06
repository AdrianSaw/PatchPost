import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassificationItem } from "@/lib/ai/classification";
import { getGenerationProvider } from "@/lib/ai/factory";
import { detectOutputLanguage } from "@/lib/ai/output-language";
import { GenerationProviderError, type GenerationProvider } from "@/lib/ai/provider";
import { getChangeInputById } from "@/lib/services/change-inputs";
import { createGeneratedOutput } from "@/lib/services/generated-outputs";
import { createGenerationRun, updateGenerationRun } from "@/lib/services/generation-runs";
import { getProjectById } from "@/lib/services/projects";
import type { DefaultTone, GeneratedOutput, GenerationRun, OutputType } from "@/types";

export interface RunGenerationWorkflowInput {
  projectId: string;
  changeInputId: string;
  outputType: OutputType;
  tone?: DefaultTone | null;
}

export interface RunGenerationWorkflowResult {
  generationRun: GenerationRun;
  generatedOutput: GeneratedOutput;
  classifiedItems: ClassificationItem[];
}

export type GenerationWorkflowErrorCode =
  | "not_found"
  | "validation"
  | "provider_rate_limit"
  | "provider_error"
  | "storage";

export class GenerationWorkflowError extends Error {
  constructor(
    message: string,
    readonly code: GenerationWorkflowErrorCode,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GenerationWorkflowError";
  }
}

interface PromptSnapshot {
  v: 1;
  provider: string;
  model: string | null;
  classifiedItems: ClassificationItem[];
  outputLanguage: "pl" | "en";
}

function formatGeneratedContent(
  title: string | null,
  content: string,
  hashtags: string | null,
  outputType: OutputType,
): { title: string | null; content: string } {
  if (outputType === "instagram_post" && hashtags) {
    return {
      title: null,
      content: `${content}\n\n${hashtags}`,
    };
  }
  return { title, content };
}

async function markRunFailed(supabase: SupabaseClient, generationRunId: string): Promise<void> {
  const { error } = await updateGenerationRun(supabase, generationRunId, { status: "failed" });
  if (error && import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- secondary failure after provider error; run may stay draft
    console.error(`[generation] Failed to mark run ${generationRunId} as failed:`, error.message);
  }
}

export function wrapProviderError(error: unknown): GenerationWorkflowError {
  if (error instanceof GenerationProviderError) {
    if (error.code === "rate_limit") {
      return new GenerationWorkflowError("AI rate limit, try again shortly", "provider_rate_limit", error);
    }
    return new GenerationWorkflowError("AI generation failed", "provider_error", error);
  }
  return new GenerationWorkflowError("AI generation failed", "provider_error", error);
}

export async function runGenerationWorkflow(
  supabase: SupabaseClient,
  userId: string,
  input: RunGenerationWorkflowInput,
  provider: GenerationProvider = getGenerationProvider(),
): Promise<RunGenerationWorkflowResult> {
  const { data: project, error: projectError } = await getProjectById(supabase, input.projectId);
  if (projectError) {
    throw new GenerationWorkflowError("Failed to load project", "storage", projectError);
  }
  if (!project) {
    throw new GenerationWorkflowError("Project not found", "not_found");
  }

  const { data: changeInput, error: changeInputError } = await getChangeInputById(supabase, input.changeInputId);
  if (changeInputError) {
    throw new GenerationWorkflowError("Failed to load change input", "storage", changeInputError);
  }
  if (changeInput?.project_id !== input.projectId) {
    throw new GenerationWorkflowError("Change input not found", "not_found");
  }

  const tone = input.tone ?? project.default_tone ?? "professional";
  const outputLanguage = detectOutputLanguage(changeInput.raw_content);

  const { data: generationRun, error: runError } = await createGenerationRun(supabase, userId, {
    project_id: input.projectId,
    change_input_id: input.changeInputId,
    output_type: input.outputType,
    tone,
    status: "draft",
  });
  if (runError || !generationRun) {
    throw new GenerationWorkflowError(
      runError?.message ?? "Failed to create generation run",
      runError?.code === "validation_error" ? "validation" : "storage",
      runError,
    );
  }

  let classifiedItems: ClassificationItem[];
  try {
    const classifyResult = await provider.classify({ project, changeInput });
    classifiedItems = classifyResult.items;
  } catch (error) {
    await markRunFailed(supabase, generationRun.id);
    throw wrapProviderError(error);
  }

  const snapshot: PromptSnapshot = {
    v: 1,
    provider: provider.name,
    model: provider.model,
    classifiedItems,
    outputLanguage,
  };

  const { error: snapshotError } = await updateGenerationRun(supabase, generationRun.id, {
    prompt_snapshot: JSON.stringify(snapshot),
  });
  if (snapshotError) {
    await markRunFailed(supabase, generationRun.id);
    throw new GenerationWorkflowError("Failed to save generation snapshot", "storage", snapshotError);
  }

  let generatedTitle: string | null;
  let generatedContent: string;
  try {
    const generateResult = await provider.generate({
      project,
      outputType: input.outputType,
      tone,
      classifiedItems,
      outputLanguage,
    });
    const formatted = formatGeneratedContent(
      generateResult.title,
      generateResult.content,
      generateResult.hashtags,
      input.outputType,
    );
    generatedTitle = formatted.title;
    generatedContent = formatted.content;
  } catch (error) {
    await markRunFailed(supabase, generationRun.id);
    throw wrapProviderError(error);
  }

  const { data: generatedOutput, error: outputError } = await createGeneratedOutput(supabase, {
    project_id: input.projectId,
    generation_run_id: generationRun.id,
    title: generatedTitle,
    content: generatedContent,
    status: "draft",
  });
  if (outputError || !generatedOutput) {
    await markRunFailed(supabase, generationRun.id);
    throw new GenerationWorkflowError(
      outputError?.message ?? "Failed to save generated output",
      outputError?.code === "validation_error" ? "validation" : "storage",
      outputError,
    );
  }

  return {
    generationRun: {
      ...generationRun,
      prompt_snapshot: JSON.stringify(snapshot),
    },
    generatedOutput,
    classifiedItems,
  };
}
