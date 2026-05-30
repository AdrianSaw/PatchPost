import type { AstroGlobal } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { getProjectById } from "@/lib/services/projects";
import type { Project } from "@/types";

export type ProjectDetailPageData =
  | { kind: "redirect"; to: string }
  | { kind: "ok"; project: Project; error: string | null };

export async function loadProjectDetailPage(
  astro: Pick<AstroGlobal, "params" | "request" | "cookies" | "url">,
): Promise<ProjectDetailPageData> {
  const projectId = astro.params.id;
  if (!z.uuid().safeParse(projectId).success) {
    return { kind: "redirect", to: "/app/projects" };
  }

  const supabase = createClient(astro.request.headers, astro.cookies);
  if (!supabase) {
    return { kind: "redirect", to: "/app/projects" };
  }

  const response = await getProjectById(supabase, projectId);
  if (response.error) {
    return { kind: "redirect", to: "/app/projects" };
  }

  const project = response.data as Project | null;
  if (!project) {
    return { kind: "redirect", to: "/app/projects" };
  }

  return {
    kind: "ok",
    project,
    error: astro.url.searchParams.get("error"),
  };
}

export function formatProjectDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}
