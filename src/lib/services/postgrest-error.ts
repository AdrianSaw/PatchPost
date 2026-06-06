import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

function synthesizePostgrestError(message: string, code = "validation_error"): PostgrestError {
  const err = {
    name: "ValidationError",
    message,
    details: "",
    hint: "",
    code,
  };
  return Object.assign(err, {
    toJSON() {
      return {
        name: err.name,
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
      };
    },
  }) satisfies PostgrestError;
}

export function validationPostgrestError(error: z.ZodError): PostgrestError {
  return synthesizePostgrestError(error.issues.map((issue) => issue.message).join("; "));
}

export function relationMismatchPostgrestError(field: string): PostgrestError {
  return synthesizePostgrestError(`${field} does not belong to project`);
}
