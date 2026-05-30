import type { APIRoute } from "astro";
import { parseProjectFormFields, PROJECT_SAVE_ERROR, projectErrorMessage } from "@/lib/api/project-form";
import { createClient } from "@/lib/supabase";
import { createProject } from "@/lib/services/projects";
import type { CreateProjectInput } from "@/types";

export const prerender = false;

function redirectWithError(context: Parameters<APIRoute>[0], message: string) {
  return context.redirect(`/app/projects/new?error=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return redirectWithError(context, "Supabase is not configured");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const fields = parseProjectFormFields(form);

  const input: CreateProjectInput = {
    name: fields.name ?? "",
    description: fields.description,
    repo_url: fields.repo_url,
    default_tone: fields.default_tone,
  };

  const { data, error } = await createProject(supabase, user.id, input);

  if (error || !data) {
    return redirectWithError(context, error ? projectErrorMessage(error) : PROJECT_SAVE_ERROR);
  }

  return context.redirect(`/app/projects/${data.id}`);
};
