import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonError, jsonResponse, parseJsonBody, parseUuidParam } from "@/lib/api/generation-api";
import { createClient } from "@/lib/supabase";
import { getGeneratedOutputById, updateGeneratedOutput } from "@/lib/services/generated-outputs";
import { getProjectById } from "@/lib/services/projects";

export const prerender = false;

const patchDraftBodySchema = z.object({
  edited_content: z.union([z.string().trim().min(1).max(65536), z.null()]),
});

export const PATCH: APIRoute = async (context) => {
  const projectId = parseUuidParam(context.params.id);
  const draftId = parseUuidParam(context.params.draftId);

  if (!projectId || !draftId) {
    return jsonError(404, "Draft not found");
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

  const { data: project, error: projectError } = await getProjectById(supabase, projectId);
  if (projectError) {
    return jsonError(503, "Failed to load project");
  }
  if (!project) {
    return jsonError(404, "Project not found");
  }

  const { data: draft, error: draftError } = await getGeneratedOutputById(supabase, draftId);
  if (draftError) {
    return jsonError(503, "Failed to load draft");
  }
  if (draft?.project_id !== projectId) {
    return jsonError(404, "Draft not found");
  }

  const parsedBody = await parseJsonBody(context.request, patchDraftBodySchema);
  if ("error" in parsedBody) {
    return parsedBody.error;
  }

  const { data: updatedDraft, error } = await updateGeneratedOutput(supabase, draftId, {
    edited_content: parsedBody.data.edited_content,
  });

  if (error || !updatedDraft) {
    const message = error?.code === "validation_error" ? error.message : "Failed to update draft";
    const status = error?.code === "validation_error" ? 422 : 503;
    return jsonError(status, message);
  }

  return jsonResponse(200, { draft: updatedDraft });
};
