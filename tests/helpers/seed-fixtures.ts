import { mockProvider } from "@/lib/ai/mock-provider";
import { createChangeInput } from "@/lib/services/change-inputs";
import { runGenerationWorkflow } from "@/lib/services/generation-workflow";
import { createProject } from "@/lib/services/projects";
import type { ChangeInput, Project } from "@/types";
import type { TestUserSession } from "./supabase-session";

export interface SeedProjectOptions {
  name?: string;
  description?: string | null;
  repo_url?: string | null;
  default_tone?: Project["default_tone"];
}

export interface SeedChangeInputOptions {
  title?: string | null;
  raw_content?: string;
}

export interface SeedDraftResult {
  generationRunId: string;
  draftId: string;
}

/** Insert a project owned by the session user via services (RLS-aware). */
export async function seedProject(session: TestUserSession, options: SeedProjectOptions = {}): Promise<Project> {
  const { data, error } = await createProject(session.client, session.user.id, {
    name: options.name ?? `Test project ${Date.now()}`,
    description: options.description ?? "Seeded for integration tests",
    repo_url: options.repo_url ?? null,
    default_tone: options.default_tone ?? null,
  });

  if (error || !data) {
    throw error ?? new Error("Failed to seed project");
  }

  return data;
}

/** Insert a change input for projectId via services. */
export async function seedChangeInput(
  session: TestUserSession,
  projectId: string,
  options: SeedChangeInputOptions = {},
): Promise<ChangeInput> {
  const { data, error } = await createChangeInput(session.client, session.user.id, {
    project_id: projectId,
    title: options.title ?? "Seeded change input",
    raw_content: options.raw_content ?? "Seeded raw content for handler contract tests.",
  });

  if (error || !data) {
    throw error ?? new Error("Failed to seed change input");
  }

  return data;
}

/** Run generation workflow with mock provider; returns run and draft (generated output) ids. */
export async function seedDraftViaGeneration(
  session: TestUserSession,
  projectId: string,
  changeInputId: string,
): Promise<SeedDraftResult> {
  const result = await runGenerationWorkflow(
    session.client,
    session.user.id,
    {
      projectId,
      changeInputId,
      outputType: "changelog",
    },
    mockProvider,
  );

  return {
    generationRunId: result.generationRun.id,
    draftId: result.generatedOutput.id,
  };
}
