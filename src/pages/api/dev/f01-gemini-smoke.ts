import type { APIRoute } from "astro";
import { getGenerationProvider } from "@/lib/ai/factory";
import { createClient } from "@/lib/supabase";
import { createProject, deleteProject } from "@/lib/services/projects";

export const prerender = false;

const POLISH_SMOKE_INPUT =
  "Naprawiono błąd kolizji w poziomie 3. Poprawiono wydajność renderowania na mapie miejskiej.";

async function postJson(url: string, cookie: string, body: unknown): Promise<{ status: number; payload: unknown }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as unknown;
  return { status: response.status, payload };
}

interface PromptSnapshotV1 {
  v?: number;
  provider?: string;
  model?: string | null;
  outputLanguage?: string;
}

/**
 * F-01 optional manual verification (4.4). Signed-in GET runs live Gemini classify/generate
 * with Polish input and asserts outputLanguage pl in prompt_snapshot.
 */
export const GET: APIRoute = async (context) => {
  if (!import.meta.env.DEV) {
    return new Response(null, { status: 404 });
  }

  let provider;
  try {
    provider = getGenerationProvider();
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider is not configured";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (provider.name !== "gemini") {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "Live Gemini provider not available. Set GEMINI_API_KEY in .env and .dev.vars, set AI_PROVIDER=gemini, stop other dev servers, then restart npm run dev and use the port shown in the terminal.",
        provider: provider.name,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
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
    name: `F-01 gemini smoke ${String(Date.now())}`,
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
      title: "Smoke PL",
      raw_content: POLISH_SMOKE_INPUT,
    });
    if (changeInputResponse.status !== 201) {
      throw new Error(`change-inputs HTTP ${String(changeInputResponse.status)}`);
    }

    const changeInputPayload = changeInputResponse.payload as { changeInput?: { id?: string } };
    const changeInputId = changeInputPayload.changeInput?.id;
    if (!changeInputId) {
      throw new Error("change-inputs response missing changeInput.id");
    }

    const generationResponse = await postJson(`${origin}/api/projects/${project.id}/generation-runs`, cookie, {
      change_input_id: changeInputId,
      output_type: "changelog",
      tone: "professional",
    });
    if (generationResponse.status !== 201) {
      const detail =
        typeof generationResponse.payload === "object" &&
        generationResponse.payload !== null &&
        "error" in generationResponse.payload
          ? String(generationResponse.payload.error)
          : String(generationResponse.status);
      throw new Error(`generation-runs failed: ${detail}`);
    }

    const generationPayload = generationResponse.payload as {
      generationRun?: { id?: string; prompt_snapshot?: string | null };
      generatedOutput?: { id?: string; content?: string };
    };
    if (!generationPayload.generatedOutput?.content?.trim()) {
      throw new Error("Generated output content is empty");
    }

    let snapshot: PromptSnapshotV1 = {};
    try {
      snapshot = JSON.parse(generationPayload.generationRun?.prompt_snapshot ?? "{}") as PromptSnapshotV1;
    } catch {
      throw new Error("prompt_snapshot is not valid JSON");
    }
    if (snapshot.outputLanguage !== "pl") {
      throw new Error(`Expected outputLanguage pl, got ${String(snapshot.outputLanguage)}`);
    }

    await deleteProject(supabase, project.id);

    return new Response(
      JSON.stringify({
        ok: true,
        provider: snapshot.provider ?? "gemini",
        model: snapshot.model,
        outputLanguage: snapshot.outputLanguage,
        created: {
          projectId: project.id,
          changeInputId,
          generationRunId: generationPayload.generationRun?.id,
          generatedOutputId: generationPayload.generatedOutput.id,
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
        step: "geminiLiveSmoke",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
