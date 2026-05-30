import type { AstroGlobal } from "astro";
import { createClient } from "@/lib/supabase";
import { loadProjectPage } from "@/lib/projects/project-page";
import { listProjectDraftHistory, type ProjectDraftHistoryItem } from "@/lib/services/generated-outputs";
import type { Project } from "@/types";

export type DraftsPageData =
  | { kind: "redirect"; to: string }
  | {
      kind: "ok";
      project: Project;
      drafts: ProjectDraftHistoryItem[];
      showSuccessBanner: boolean;
      listError: string | null;
      listTruncated: boolean;
    };

export async function loadDraftsPage(
  astro: Pick<AstroGlobal, "params" | "request" | "cookies" | "url">,
): Promise<DraftsPageData> {
  const page = await loadProjectPage(astro);
  if (page.kind === "redirect") {
    return page;
  }

  const supabase = createClient(astro.request.headers, astro.cookies);
  if (!supabase) {
    return { kind: "redirect", to: "/app/projects" };
  }

  const { data, error, truncated } = await listProjectDraftHistory(supabase, page.project.id);

  return {
    kind: "ok",
    project: page.project,
    drafts: data ?? [],
    showSuccessBanner: astro.url.searchParams.get("success") === "generated",
    listError: error ? "Unable to load draft history. Please try again." : null,
    listTruncated: truncated,
  };
}
