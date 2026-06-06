import { beforeAll, describe, expect, it, vi } from "vitest";
import { parsePromptSnapshot } from "@/lib/generation/prompt-snapshot";
import { classificationResultSchema } from "@/lib/ai/classification";
import { getGeneratedOutputById } from "@/lib/services/generated-outputs";
import { getGenerationRunById } from "@/lib/services/generation-runs";
import { POST as postGenerationRun } from "@/pages/api/projects/[id]/generation-runs";
import { createJsonApiContext } from "../helpers/json-api-context";
import { buildMultiLineGuardrailInput } from "../helpers/guardrail-fixtures";
import { seedChangeInput, seedProject } from "../helpers/seed-fixtures";
import { createTestUser, type TestUserSession } from "../helpers/supabase-session";
import { assertSupabaseReachable, hasLocalSupabaseConfig } from "../setup";

function shouldRunLiveGeminiSmoke(): boolean {
  if (!hasLocalSupabaseConfig()) {
    return false;
  }
  if (process.env.RUN_LIVE_GEMINI_SMOKE !== "1") {
    return false;
  }
  if (process.env.AI_PROVIDER === "mock") {
    return false;
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && !key.includes("<"));
}

describe.skipIf(!shouldRunLiveGeminiSmoke())("generation live Gemini smoke (optional)", () => {
  let session: TestUserSession;
  let projectId: string;

  beforeAll(async () => {
    await assertSupabaseReachable();
    vi.stubEnv("SUPABASE_URL", process.env.SUPABASE_URL ?? "");
    vi.stubEnv("SUPABASE_KEY", process.env.SUPABASE_KEY ?? "");
    vi.stubEnv("GEMINI_API_KEY", process.env.GEMINI_API_KEY ?? "");
    if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== "mock") {
      vi.stubEnv("AI_PROVIDER", process.env.AI_PROVIDER);
    } else {
      vi.stubEnv("AI_PROVIDER", "");
    }

    session = await createTestUser("generation-live-smoke");
    const project = await seedProject(session, { name: "Live smoke project" });
    projectId = project.id;
  });

  it("returns structurally valid classified items with fixture token in classification source", async () => {
    const fixture = buildMultiLineGuardrailInput();
    const changeInput = await seedChangeInput(session, projectId, { raw_content: fixture.raw_content });

    const { context } = createJsonApiContext(session, {
      pathname: `/api/projects/${projectId}/generation-runs`,
      params: { id: projectId },
      body: { change_input_id: changeInput.id, output_type: "changelog", tone: "professional" },
    });

    const response = await postGenerationRun(context);
    expect(response.status, await response.clone().text()).toBe(201);

    const payload = (await response.json()) as {
      generationRun: { id: string };
      generatedOutput: { id: string };
      classifiedItems: unknown;
    };

    const parsedClassification = classificationResultSchema.safeParse({
      items: payload.classifiedItems,
    });
    expect(parsedClassification.success).toBe(true);
    if (!parsedClassification.success) {
      return;
    }
    expect(parsedClassification.data.items.length).toBeGreaterThan(0);
    expect(parsedClassification.data.items.some((item) => item.source.includes(fixture.accepted))).toBe(true);

    const { data: run } = await getGenerationRunById(session.client, payload.generationRun.id);
    const snapshot = parsePromptSnapshot(run?.prompt_snapshot);
    expect(snapshot?.provider).toBe("gemini");
    expect(run?.prompt_snapshot).toContain('"provider":"gemini"');

    const { data: output } = await getGeneratedOutputById(session.client, payload.generatedOutput.id);
    expect(output?.content.trim().length).toBeGreaterThan(0);
  });
});
