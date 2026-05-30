import type { APIRoute } from "astro";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { createProject } from "@/lib/services/projects";
import type { CreateProjectInput, DefaultTone } from "@/types";
import { defaultToneSchema } from "@/types";

export const prerender = false;

const GENERIC_ERROR = "Unable to save project. Please try again.";

function formString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseDefaultTone(value: FormDataEntryValue | null): DefaultTone | null | undefined {
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = defaultToneSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function projectErrorMessage(error: PostgrestError): string {
  if (error.code === "validation_error") {
    return error.message;
  }
  return GENERIC_ERROR;
}

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
  const defaultTone = parseDefaultTone(form.get("default_tone"));

  const input: CreateProjectInput = {
    name: formString(form.get("name")) ?? "",
    description: formString(form.get("description")) ?? null,
    repo_url: formString(form.get("repo_url")) ?? null,
    default_tone: defaultTone,
  };

  const { data, error } = await createProject(supabase, user.id, input);

  if (error || !data) {
    return redirectWithError(context, error ? projectErrorMessage(error) : GENERIC_ERROR);
  }

  return context.redirect(`/app/projects/${data.id}`);
};
