import { beforeAll, describe, expect, it, vi } from "vitest";
import { getGeneratedOutputById } from "@/lib/services/generated-outputs";
import { PATCH as patchDraft } from "@/pages/api/projects/[id]/drafts/[draftId]";
import { createJsonApiContext } from "../helpers/json-api-context";
import { seedChangeInput, seedDraftViaGeneration, seedProject } from "../helpers/seed-fixtures";
import { createTestUser, type TestUserSession } from "../helpers/supabase-session";
import { assertSupabaseReachable, hasLocalSupabaseConfig } from "../setup";

describe.skipIf(!hasLocalSupabaseConfig())("drafts API contracts", () => {
  let session: TestUserSession;
  let projectId: string;
  let draftId: string;

  beforeAll(async () => {
    await assertSupabaseReachable();
    vi.stubEnv("SUPABASE_URL", process.env.SUPABASE_URL ?? "");
    vi.stubEnv("SUPABASE_KEY", process.env.SUPABASE_KEY ?? "");

    session = await createTestUser("drafts-contracts");
    const project = await seedProject(session, { name: "Drafts contract project" });
    projectId = project.id;
    const changeInput = await seedChangeInput(session, projectId);
    const seeded = await seedDraftViaGeneration(session, projectId, changeInput.id);
    draftId = seeded.draftId;
  });

  it("updates edited_content and returns 200 with persisted value", async () => {
    const { context } = createJsonApiContext(session, {
      method: "PATCH",
      pathname: `/api/projects/${projectId}/drafts/${draftId}`,
      params: { id: projectId, draftId },
      body: { edited_content: "Player-facing draft edit from contract test." },
    });

    const response = await patchDraft(context);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { draft: { edited_content: string | null } };
    expect(payload.draft.edited_content).toBe("Player-facing draft edit from contract test.");

    const { data: row } = await getGeneratedOutputById(session.client, draftId);
    expect(row?.edited_content).toBe("Player-facing draft edit from contract test.");
  });

  it("returns 422 for empty edited_content without changing the draft", async () => {
    const { data: before } = await getGeneratedOutputById(session.client, draftId);
    const contentBefore = before?.edited_content;

    const { context } = createJsonApiContext(session, {
      method: "PATCH",
      pathname: `/api/projects/${projectId}/drafts/${draftId}`,
      params: { id: projectId, draftId },
      body: { edited_content: "" },
    });

    const response = await patchDraft(context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringMatching(/.+/) as string }),
    );

    const { data: after } = await getGeneratedOutputById(session.client, draftId);
    expect(after?.edited_content).toBe(contentBefore);
  });

  it("reverts edited_content to null when PATCH sends null", async () => {
    const { context } = createJsonApiContext(session, {
      method: "PATCH",
      pathname: `/api/projects/${projectId}/drafts/${draftId}`,
      params: { id: projectId, draftId },
      body: { edited_content: null },
    });

    const response = await patchDraft(context);
    expect(response.status).toBe(200);

    const { data: row } = await getGeneratedOutputById(session.client, draftId);
    expect(row?.edited_content).toBeNull();
    expect(row?.content.length).toBeGreaterThan(0);
  });
});
