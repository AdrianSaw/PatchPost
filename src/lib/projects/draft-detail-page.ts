import type { AstroGlobal } from "astro";
import { z } from "zod";
import type { ClassificationItem } from "@/lib/ai/classification";
import { parsePromptSnapshot } from "@/lib/generation/prompt-snapshot";
import { createClient } from "@/lib/supabase";
import { loadProjectPage } from "@/lib/projects/project-page";
import { getGeneratedOutputById } from "@/lib/services/generated-outputs";
import { getGenerationRunById } from "@/lib/services/generation-runs";
import type { GeneratedOutput, GenerationRun, Project } from "@/types";

export type DraftDetailPageData =
  | { kind: "redirect"; to: string }
  | {
      kind: "ok";
      project: Project;
      draft: GeneratedOutput;
      generationRun: GenerationRun | null;
      classifiedItems: ClassificationItem[];
      outputLanguage: "pl" | "en" | null;
    };

export async function loadDraftDetailPage(
  astro: Pick<AstroGlobal, "params" | "request" | "cookies">,
): Promise<DraftDetailPageData> {
  const page = await loadProjectPage(astro);
  if (page.kind === "redirect") {
    return page;
  }

  const draftId = astro.params.draftId;
  if (!z.uuid().safeParse(draftId).success) {
    return { kind: "redirect", to: `/app/projects/${page.project.id}/drafts` };
  }

  const supabase = createClient(astro.request.headers, astro.cookies);
  if (!supabase) {
    return { kind: "redirect", to: `/app/projects/${page.project.id}/drafts` };
  }

  const { data: draft, error: draftError } = await getGeneratedOutputById(supabase, draftId);
  if (draftError || draft?.project_id !== page.project.id) {
    return { kind: "redirect", to: `/app/projects/${page.project.id}/drafts` };
  }

  let generationRun: GenerationRun | null = null;
  let classifiedItems: ClassificationItem[] = [];
  let outputLanguage: "pl" | "en" | null = null;

  if (draft.generation_run_id) {
    const { data: run, error: runError } = await getGenerationRunById(supabase, draft.generation_run_id);
    if (!runError && run) {
      generationRun = run;
      const snapshot = parsePromptSnapshot(run.prompt_snapshot);
      classifiedItems = snapshot?.classifiedItems ?? [];
      outputLanguage = snapshot?.outputLanguage ?? null;
    }
  }

  return {
    kind: "ok",
    project: page.project,
    draft,
    generationRun,
    classifiedItems,
    outputLanguage,
  };
}
