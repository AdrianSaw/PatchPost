import { beforeAll, describe, expect, it, vi } from "vitest";
import { getGenerationRunById, listGenerationRunsByProject } from "@/lib/services/generation-runs";
import { getGeneratedOutputById } from "@/lib/services/generated-outputs";
import { POST as postGenerationRun } from "@/pages/api/projects/[id]/generation-runs";
import { createJsonApiContext } from "../helpers/json-api-context";
import { seedChangeInput, seedProject } from "../helpers/seed-fixtures";
import { createTestUser, type TestUserSession } from "../helpers/supabase-session";
import { assertSupabaseReachable, hasLocalSupabaseConfig } from "../setup";

describe.skipIf(!hasLocalSupabaseConfig())("generation-runs API contracts", () => {
  let session: TestUserSession;
  let projectId: string;
  let changeInputId: string;

  beforeAll(async () => {
    await assertSupabaseReachable();
    vi.stubEnv("SUPABASE_URL", process.env.SUPABASE_URL ?? "");
    vi.stubEnv("SUPABASE_KEY", process.env.SUPABASE_KEY ?? "");

    session = await createTestUser("generation-runs-contracts");
    const project = await seedProject(session, { name: "Generation contract project" });
    projectId = project.id;
    const changeInput = await seedChangeInput(session, projectId, {
      raw_content: "Balance patch: reduced rifle damage by 10%.",
    });
    changeInputId = changeInput.id;
  });

  it("creates generation run and output with mock provider header", async () => {
    const { context } = createJsonApiContext(session, {
      pathname: `/api/projects/${projectId}/generation-runs`,
      params: { id: projectId },
      body: { change_input_id: changeInputId, output_type: "changelog" },
      extraHeaders: { "x-dev-mock-provider": "1" },
    });

    const response = await postGenerationRun(context);
    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      generationRun: { id: string };
      generatedOutput: { id: string };
    };
    expect(payload.generationRun.id).toBeTruthy();
    expect(payload.generatedOutput.id).toBeTruthy();

    const { data: run } = await getGenerationRunById(session.client, payload.generationRun.id);
    expect(run?.project_id).toBe(projectId);

    const { data: output } = await getGeneratedOutputById(session.client, payload.generatedOutput.id);
    expect(output?.generation_run_id).toBe(payload.generationRun.id);
  });

  it("returns 422 for invalid output_type without new generation runs", async () => {
    const { data: beforeList } = await listGenerationRunsByProject(session.client, projectId);
    const countBefore = beforeList?.length ?? 0;

    const { context } = createJsonApiContext(session, {
      pathname: `/api/projects/${projectId}/generation-runs`,
      params: { id: projectId },
      body: { change_input_id: changeInputId, output_type: "not_a_valid_type" },
      extraHeaders: { "x-dev-mock-provider": "1" },
    });

    const response = await postGenerationRun(context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringMatching(/.+/) as string }),
    );

    const { data: afterList } = await listGenerationRunsByProject(session.client, projectId);
    expect(afterList?.length ?? 0).toBe(countBefore);
  });
});
