import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonError, jsonResponse, parseJsonBody, parseUuidParam } from "@/lib/api/generation-api";
import { createClient } from "@/lib/supabase";
import { createChangeInput } from "@/lib/services/change-inputs";
import { getProjectById } from "@/lib/services/projects";

export const prerender = false;

const createChangeInputBodySchema = z.object({
  title: z.string().trim().optional().nullable(),
  raw_content: z.string().trim().min(1).max(65536),
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

  const { data: project, error: projectError } = await getProjectById(supabase, projectId);
  if (projectError) {
    return jsonError(503, "Failed to load project");
  }
  if (!project) {
    return jsonError(404, "Project not found");
  }

  const parsedBody = await parseJsonBody(context.request, createChangeInputBodySchema);
  if ("error" in parsedBody) {
    return parsedBody.error;
  }

  const { data: changeInput, error } = await createChangeInput(supabase, user.id, {
    project_id: projectId,
    title: parsedBody.data.title ?? null,
    raw_content: parsedBody.data.raw_content,
  });

  if (error || !changeInput) {
    const message = error?.code === "validation_error" ? error.message : "Failed to create change input";
    const status = error?.code === "validation_error" ? 422 : 503;
    return jsonError(status, message);
  }

  return jsonResponse(201, { changeInput });
};
