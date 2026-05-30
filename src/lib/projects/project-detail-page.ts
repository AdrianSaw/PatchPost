import type { AstroGlobal } from "astro";
import { loadProjectPage } from "@/lib/projects/project-page";
import type { Project } from "@/types";

export type ProjectDetailPageData =
  | { kind: "redirect"; to: string }
  | { kind: "ok"; project: Project; error: string | null };

export async function loadProjectDetailPage(
  astro: Pick<AstroGlobal, "params" | "request" | "cookies" | "url">,
): Promise<ProjectDetailPageData> {
  const page = await loadProjectPage(astro);
  if (page.kind === "redirect") {
    return page;
  }

  return {
    kind: "ok",
    project: page.project,
    error: astro.url.searchParams.get("error"),
  };
}

export function formatProjectDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}
