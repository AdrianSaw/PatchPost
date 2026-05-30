import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import {
  createChangeInput,
  createGeneratedOutput,
  createGenerationRun,
  createProject,
  deleteProject,
  listChangeInputsByProject,
  listGeneratedOutputsByProject,
  listGenerationRunsByProject,
  listProjects,
} from "@/lib/services";

export const prerender = false;

/**
 * F-02 manual verification only. Signed-in GET runs create/list smoke for all four services.
 * Remove or gate before production if kept long-term.
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
    name: `F-02 smoke ${Date.now()}`,
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

  const { data: run, error: runError } = await createGenerationRun(supabase, user.id, {
    project_id: project.id,
    change_input_id: changeInput.id,
    output_type: "changelog",
    tone: "professional",
    status: "draft",
  });
  if (runError || !run) {
    await deleteProject(supabase, project.id);
    return new Response(JSON.stringify({ ok: false, step: "createGenerationRun", error: runError }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: output, error: outputError } = await createGeneratedOutput(supabase, {
    project_id: project.id,
    generation_run_id: run.id,
    title: "Smoke draft",
    content: "Level 3 collision fix",
    status: "draft",
  });
  if (outputError || !output) {
    await deleteProject(supabase, project.id);
    return new Response(JSON.stringify({ ok: false, step: "createGeneratedOutput", error: outputError }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [projects, inputs, runs, outputs] = await Promise.all([
    listProjects(supabase),
    listChangeInputsByProject(supabase, project.id),
    listGenerationRunsByProject(supabase, project.id),
    listGeneratedOutputsByProject(supabase, project.id),
  ]);

  await deleteProject(supabase, project.id);

  return new Response(
    JSON.stringify({
      ok: true,
      created: {
        projectId: project.id,
        changeInputId: changeInput.id,
        generationRunId: run.id,
        generatedOutputId: output.id,
      },
      listCounts: {
        projects: projects.data?.length ?? 0,
        changeInputs: inputs.data?.length ?? 0,
        generationRuns: runs.data?.length ?? 0,
        generatedOutputs: outputs.data?.length ?? 0,
      },
      cleanedUp: true,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
