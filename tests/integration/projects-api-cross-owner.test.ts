import { beforeAll, describe, expect, it, vi } from "vitest";
import { POST as postProjectById } from "@/pages/api/projects/[id]";
import { createProject, getProjectById } from "@/lib/services/projects";
import { createApiContext } from "../helpers/api-context";
import { createTestUser, type TestUserSession } from "../helpers/supabase-session";
import { assertSupabaseReachable, hasLocalSupabaseConfig } from "../setup";

describe.skipIf(!hasLocalSupabaseConfig())("projects API cross-owner form POST", () => {
  let userA: TestUserSession;
  let userB: TestUserSession;
  let projectId: string;
  const originalName = "Protected API project";

  beforeAll(async () => {
    await assertSupabaseReachable();
    vi.stubEnv("SUPABASE_URL", process.env.SUPABASE_URL ?? "");
    vi.stubEnv("SUPABASE_KEY", process.env.SUPABASE_KEY ?? "");

    userA = await createTestUser("api-owner-a");
    userB = await createTestUser("api-owner-b");

    const { data: project, error } = await createProject(userA.client, userA.user.id, {
      name: originalName,
      description: "Handler cross-owner probe",
      repo_url: null,
      default_tone: null,
    });
    if (error || !project) {
      throw error ?? new Error("Failed to seed project for User A");
    }
    projectId = project.id;
  });

  it("does not update User A project when User B POSTs _action=update", async () => {
    const form = new FormData();
    form.set("_action", "update");
    form.set("name", "Stolen by User B");

    const { context } = createApiContext({
      method: "POST",
      pathname: `/api/projects/${projectId}`,
      params: { id: projectId },
      body: form,
      cookieHeader: userB.cookieHeader,
    });

    await postProjectById(context);

    const { data: project } = await getProjectById(userA.client, projectId);
    expect(project?.name).toBe(originalName);
  });

  it("does not delete User A project when User B POSTs _action=delete", async () => {
    const form = new FormData();
    form.set("_action", "delete");

    const { context } = createApiContext({
      method: "POST",
      pathname: `/api/projects/${projectId}`,
      params: { id: projectId },
      body: form,
      cookieHeader: userB.cookieHeader,
    });

    await postProjectById(context);

    const { data: project } = await getProjectById(userA.client, projectId);
    expect(project?.id).toBe(projectId);
    expect(project?.name).toBe(originalName);
  });
});
