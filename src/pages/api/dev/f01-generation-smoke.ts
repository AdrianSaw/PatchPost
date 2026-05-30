import type { APIRoute } from "astro";
import { mockProvider } from "@/lib/ai/mock-provider";
import { createClient } from "@/lib/supabase";
import { createProject, deleteProject } from "@/lib/services/projects";

export const prerender = false;

const DEV_MOCK_HEADER = "x-dev-mock-provider";

async function postJson(
  url: string,
  cookie: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; payload: unknown }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as unknown;
  return { status: response.status, payload };
}

/**
 * F-01 manual verification only. Signed-in GET exercises HTTP change-inputs +
 * generation-runs routes (3.3) with MockProvider via dev header.
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

  const cookie = context.request.headers.get("cookie") ?? "";
  const origin = new URL(context.request.url).origin;

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

  try {
    const changeInputResponse = await postJson(`${origin}/api/projects/${project.id}/change-inputs`, cookie, {
      title: "Smoke input",
      raw_content: "Fixed collision bug in level 3",
    });
    if (changeInputResponse.status !== 201) {
      throw new Error(`change-inputs HTTP ${String(changeInputResponse.status)}`);
    }

    const changeInputPayload = changeInputResponse.payload as {
      changeInput?: { id?: string };
    };
    const changeInputId = changeInputPayload.changeInput?.id;
    if (!changeInputId) {
      throw new Error("change-inputs response missing changeInput.id");
    }

    const generationResponse = await postJson(
      `${origin}/api/projects/${project.id}/generation-runs`,
      cookie,
      {
        change_input_id: changeInputId,
        output_type: "changelog",
        tone: "professional",
      },
      { [DEV_MOCK_HEADER]: "1" },
    );
    if (generationResponse.status !== 201) {
      throw new Error(`generation-runs HTTP ${String(generationResponse.status)}`);
    }

    const generationPayload = generationResponse.payload as {
      generationRun?: { id?: string };
      generatedOutput?: { id?: string; content?: string };
      classifiedItems?: unknown[];
    };
    if (!generationPayload.generatedOutput?.content?.trim()) {
      throw new Error("Generated output content is empty");
    }

    await deleteProject(supabase, project.id);

    return new Response(
      JSON.stringify({
        ok: true,
        provider: mockProvider.name,
        httpVerified: true,
        created: {
          projectId: project.id,
          changeInputId,
          generationRunId: generationPayload.generationRun?.id,
          generatedOutputId: generationPayload.generatedOutput.id,
          classifiedItemCount: generationPayload.classifiedItems?.length ?? 0,
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
        step: "httpApiSmoke",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
