import { beforeAll, describe, expect, it, vi } from "vitest";
import { getChangeInputById, listChangeInputsByProject } from "@/lib/services/change-inputs";
import { POST as postChangeInput } from "@/pages/api/projects/[id]/change-inputs";
import { createJsonApiContext } from "../helpers/json-api-context";
import { seedProject } from "../helpers/seed-fixtures";
import { createTestUser, type TestUserSession } from "../helpers/supabase-session";
import { assertSupabaseReachable, hasLocalSupabaseConfig } from "../setup";

describe.skipIf(!hasLocalSupabaseConfig())("change-inputs API contracts", () => {
  let session: TestUserSession;
  let projectId: string;

  beforeAll(async () => {
    await assertSupabaseReachable();
    vi.stubEnv("SUPABASE_URL", process.env.SUPABASE_URL ?? "");
    vi.stubEnv("SUPABASE_KEY", process.env.SUPABASE_KEY ?? "");

    session = await createTestUser("change-inputs-contracts");
    const project = await seedProject(session, { name: "Change inputs contract project" });
    projectId = project.id;
  });

  it("creates a change input and returns 201 with persisted content", async () => {
    const { context } = createJsonApiContext(session, {
      pathname: `/api/projects/${projectId}/change-inputs`,
      params: { id: projectId },
      body: { title: "Patch notes", raw_content: "Fixed crash on login screen." },
    });

    const response = await postChangeInput(context);
    expect(response.status).toBe(201);

    const payload = (await response.json()) as { changeInput: { id: string; raw_content: string } };
    expect(payload.changeInput.id).toBeTruthy();

    const { data: row } = await getChangeInputById(session.client, payload.changeInput.id);
    expect(row?.raw_content).toBe("Fixed crash on login screen.");
  });

  it("returns 422 for empty raw_content without creating a row", async () => {
    const { data: beforeList } = await listChangeInputsByProject(session.client, projectId);
    const countBefore = beforeList?.length ?? 0;

    const { context } = createJsonApiContext(session, {
      pathname: `/api/projects/${projectId}/change-inputs`,
      params: { id: projectId },
      body: { raw_content: "" },
    });

    const response = await postChangeInput(context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringMatching(/.+/) as string }),
    );

    const { data: afterList } = await listChangeInputsByProject(session.client, projectId);
    expect(afterList?.length ?? 0).toBe(countBefore);
  });

  it("returns 422 when raw_content is missing without creating a row", async () => {
    const { data: beforeList } = await listChangeInputsByProject(session.client, projectId);
    const countBefore = beforeList?.length ?? 0;

    const { context } = createJsonApiContext(session, {
      pathname: `/api/projects/${projectId}/change-inputs`,
      params: { id: projectId },
      body: { title: "Patch notes only" },
    });

    const response = await postChangeInput(context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringMatching(/.+/) as string }),
    );

    const { data: afterList } = await listChangeInputsByProject(session.client, projectId);
    expect(afterList?.length ?? 0).toBe(countBefore);
  });
});
