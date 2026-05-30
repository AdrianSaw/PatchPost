import type { PostgrestError } from "@supabase/supabase-js";
import type { DefaultTone } from "@/types";
import { defaultToneSchema } from "@/types";

export const PROJECT_SAVE_ERROR = "Unable to save project. Please try again.";
export const PROJECT_DELETE_ERROR = "Unable to delete project. Please try again.";

export function projectErrorMessage(error: PostgrestError, generic = PROJECT_SAVE_ERROR): string {
  if (error.code === "validation_error") {
    return error.message;
  }
  return generic;
}

export function formString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseDefaultTone(value: FormDataEntryValue | null): DefaultTone | null | undefined {
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = defaultToneSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseProjectFormFields(form: FormData) {
  return {
    name: formString(form.get("name")),
    description: formString(form.get("description")) ?? null,
    repo_url: formString(form.get("repo_url")) ?? null,
    default_tone: parseDefaultTone(form.get("default_tone")),
  };
}
