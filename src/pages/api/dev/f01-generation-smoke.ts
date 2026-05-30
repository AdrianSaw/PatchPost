import type { APIRoute } from "astro";
import { mockProvider } from "@/lib/ai/mock-provider";
import { createClient } from "@/lib/supabase";
import { createChangeInput } from "@/lib/services/change-inputs";
import { runGenerationWorkflow } from "@/lib/services/generation-workflow";
import { createProject, deleteProject } from "@/lib/services/projects";

export const prerender = false;

/**
 * F-01 manual verification only. Signed-in GET runs classify/generate/persist smoke with MockProvider.
 */
export const GET: APIRoute = async (context) => {
  if (!import.meta.env.DEV) {
    return new Response(null, { status: 404 });
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false, error: "Supabase is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ ok: false, error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: project, error: projectError } = await createProject(supabase, user.id, {
    name: `F-01 smoke ${String(Date.now())}`,
    default_tone: "professional",
  });
  if (projectError || !project) {
    return new Response(JSON.stringify({ ok: false, step: "createProject", error: projectError }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: changeInput, error: inputError } = await createChangeInput(supabase, user.id, {
    project_id: project.id,
    title: "Smoke input",
    raw_content: "Fixed collision bug in level 3",
  });
  if (inputError || !changeInput) {
    await deleteProject(supabase, project.id);
    return new Response(JSON.stringify({ ok: false, step: "createChangeInput", error: inputError }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await runGenerationWorkflow(
      supabase,
      user.id,
      {
        projectId: project.id,
        changeInputId: changeInput.id,
        outputType: "changelog",
        tone: "professional",
      },
      mockProvider,
    );

    if (!result.generatedOutput.content.trim()) {
      throw new Error("Generated output content is empty");
    }

    await deleteProject(supabase, project.id);

    return new Response(
      JSON.stringify({
        ok: true,
        provider: mockProvider.name,
        created: {
          projectId: project.id,
          changeInputId: changeInput.id,
          generationRunId: result.generationRun.id,
          generatedOutputId: result.generatedOutput.id,
          classifiedItemCount: result.classifiedItems.length,
        },
        cleanedUp: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    await deleteProject(supabase, project.id);
    return new Response(
      JSON.stringify({
        ok: false,
        step: "runGenerationWorkflow",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
