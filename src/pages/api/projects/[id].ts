import type { APIRoute } from "astro";
import { z } from "zod";
import {
  parseProjectFormFields,
  PROJECT_DELETE_ERROR,
  PROJECT_SAVE_ERROR,
  projectErrorMessage,
} from "@/lib/api/project-form";
import { createClient } from "@/lib/supabase";
import { deleteProject, updateProject } from "@/lib/services/projects";

export const prerender = false;

function redirectWithError(context: Parameters<APIRoute>[0], projectId: string, message: string) {
  return context.redirect(`/app/projects/${projectId}?error=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async (context) => {
  const projectId = context.params.id;
  if (!z.uuid().safeParse(projectId).success) {
    return context.redirect("/app/projects");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return redirectWithError(context, projectId, "Supabase is not configured");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const action = form.get("_action");

  if (action === "delete") {
    const { error } = await deleteProject(supabase, projectId);
    if (error) {
      return redirectWithError(context, projectId, projectErrorMessage(error, PROJECT_DELETE_ERROR));
    }
    return context.redirect("/app/projects");
  }

  if (action === "update") {
    const input = parseProjectFormFields(form);
    const { data, error } = await updateProject(supabase, projectId, input);

    if (error || !data) {
      return redirectWithError(context, projectId, error ? projectErrorMessage(error) : PROJECT_SAVE_ERROR);
    }

    return context.redirect(`/app/projects/${projectId}`);
  }

  return redirectWithError(context, projectId, "Invalid action");
};
