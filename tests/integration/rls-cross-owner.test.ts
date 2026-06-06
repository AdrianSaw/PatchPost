import { beforeAll, describe, expect, it, vi } from "vitest";
import { createChangeInput, getChangeInputById, listChangeInputsByProject } from "@/lib/services/change-inputs";
import { createProject, deleteProject, getProjectById, listProjects, updateProject } from "@/lib/services/projects";
import type { Project } from "@/types";
import { createTestUser, type TestUserSession } from "../helpers/supabase-session";
import { assertSupabaseReachable, hasLocalSupabaseConfig } from "../setup";

describe.skipIf(!hasLocalSupabaseConfig())("RLS cross-owner access", () => {
  let userA: TestUserSession;
  let userB: TestUserSession;
  let projectId: string;
  let changeInputId: string;
  const originalName = "User A RLS project";

  beforeAll(async () => {
    await assertSupabaseReachable();
    vi.stubEnv("SUPABASE_URL", process.env.SUPABASE_URL ?? "");
    vi.stubEnv("SUPABASE_KEY", process.env.SUPABASE_KEY ?? "");

    userA = await createTestUser("rls-owner-a");
    userB = await createTestUser("rls-owner-b");

    const { data: project, error: projectError } = await createProject(userA.client, userA.user.id, {
      name: originalName,
      description: "Cross-owner probe",
      repo_url: null,
      default_tone: null,
    });
    if (projectError || !project) {
      throw projectError ?? new Error("Failed to seed project for User A");
    }
    projectId = project.id;

    const { data: changeInput, error: changeInputError } = await createChangeInput(userA.client, userA.user.id, {
      project_id: projectId,
      title: "Owner A input",
      raw_content: "Only User A should read this change input.",
    });
    if (changeInputError || !changeInput) {
      throw changeInputError ?? new Error("Failed to seed change input for User A");
    }
    changeInputId = changeInput.id;
  });

  it("returns null from getProjectById for User B", async () => {
    const { data, error } = await getProjectById(userB.client, projectId);
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("excludes User A project from listProjects for User B", async () => {
    const { data, error } = await listProjects(userB.client);
    expect(error).toBeNull();
    const projectIds = ((data ?? []) as Project[]).map((project) => project.id);
    expect(projectIds).not.toContain(projectId);
  });

  it("does not update User A project when User B calls updateProject", async () => {
    await updateProject(userB.client, projectId, { name: "Hacked by User B" });

    const { data: project } = await getProjectById(userA.client, projectId);
    expect(project?.name).toBe(originalName);
  });

  it("does not delete User A project when User B calls deleteProject", async () => {
    const { error } = await deleteProject(userB.client, projectId);
    expect(error).toBeNull();

    const { data: project } = await getProjectById(userA.client, projectId);
    expect(project?.id).toBe(projectId);
  });

  it("returns null from getChangeInputById for User B", async () => {
    const { data, error } = await getChangeInputById(userB.client, changeInputId);
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("returns no rows from listChangeInputsByProject for User B on User A project", async () => {
    const { data, error } = await listChangeInputsByProject(userB.client, projectId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
