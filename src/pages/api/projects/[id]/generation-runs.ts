import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonError, jsonResponse, parseJsonBody, parseUuidParam } from "@/lib/api/generation-api";
import { createClient } from "@/lib/supabase";
import { GenerationWorkflowError, runGenerationWorkflow } from "@/lib/services/generation-workflow";
import { defaultToneSchema, outputTypeSchema } from "@/types";

export const prerender = false;

const createGenerationRunBodySchema = z.object({
  change_input_id: z.uuid(),
  output_type: outputTypeSchema,
  tone: defaultToneSchema.optional(),
});

export const POST: APIRoute = async (context) => {
  const projectId = parseUuidParam(context.params.id);
  if (!projectId) {
    return jsonError(404, "Project not found");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonError(503, "Supabase is not configured");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError(401, "Not authenticated");
  }

  const parsedBody = await parseJsonBody(context.request, createGenerationRunBodySchema);
  if ("error" in parsedBody) {
    return parsedBody.error;
  }

  try {
    const result = await runGenerationWorkflow(supabase, user.id, {
      projectId,
      changeInputId: parsedBody.data.change_input_id,
      outputType: parsedBody.data.output_type,
      tone: parsedBody.data.tone ?? null,
    });

    return jsonResponse(201, {
      generationRun: result.generationRun,
      generatedOutput: result.generatedOutput,
      classifiedItems: result.classifiedItems,
    });
  } catch (error) {
    if (error instanceof GenerationWorkflowError) {
      switch (error.code) {
        case "not_found":
          return jsonError(404, error.message);
        case "validation":
          return jsonError(422, error.message);
        case "provider_rate_limit":
          return jsonError(503, error.message);
        case "provider_error":
          return jsonError(502, error.message);
        case "storage":
          return jsonError(503, error.message);
      }
    }
    return jsonError(503, "Generation failed");
  }
};
