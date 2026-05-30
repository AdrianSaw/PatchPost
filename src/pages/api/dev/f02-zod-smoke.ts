import type { APIRoute } from "astro";
import { createGenerationRunSchema } from "@/types";

export const prerender = false;

/**
 * F-02 manual verification only. Validates that Zod rejects invalid enums before any Supabase call.
 */
export const GET: APIRoute = () => {
  const parsed = createGenerationRunSchema.safeParse({
    project_id: "00000000-0000-0000-0000-000000000001",
    output_type: "not_a_valid_output_type",
  });

  return new Response(
    JSON.stringify({
      ok: !parsed.success,
      issues: parsed.success ? [] : parsed.error.issues.map((issue) => issue.message),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
