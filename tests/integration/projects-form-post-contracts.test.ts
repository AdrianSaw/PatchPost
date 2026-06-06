import { beforeAll, describe, expect, it, vi } from "vitest";
import { getProjectById, listProjects } from "@/lib/services/projects";
import { POST as postProject } from "@/pages/api/projects/index";
import { POST as postProjectById } from "@/pages/api/projects/[id]";
import { createAuthenticatedFormContext } from "../helpers/authenticated-api-context";
import {
  expectFormErrorRedirect,
  expectRedirectToProject,
  expectRedirectToProjectsList,
  extractProjectIdFromRedirects,
} from "../helpers/redirect-assertions";
import { seedProject } from "../helpers/seed-fixtures";
import { createTestUser, type TestUserSession } from "../helpers/supabase-session";
import { assertSupabaseReachable, hasLocalSupabaseConfig } from "../setup";

// Cross-owner delete redirect shape is covered in projects-api-cross-owner.test.ts (Phase 1).

describe.skipIf(!hasLocalSupabaseConfig())("projects form POST contracts", () => {
  let session: TestUserSession;

  beforeAll(async () => {
    await assertSupabaseReachable();
    vi.stubEnv("SUPABASE_URL", process.env.SUPABASE_URL ?? "");
    vi.stubEnv("SUPABASE_KEY", process.env.SUPABASE_KEY ?? "");
    session = await createTestUser("form-contracts-owner");
  });

  it("creates a project and redirects to its detail page with persisted fields", async () => {
    const form = new FormData();
    form.set("name", "Contract create project");
    form.set("description", "Created via form POST contract test");

    const { context, redirects } = createAuthenticatedFormContext(session, {
      method: "POST",
      pathname: "/api/projects",
      body: form,
    });

    await postProject(context);

    const projectId = extractProjectIdFromRedirects(redirects);
    if (!projectId) {
      throw new Error(`Expected project id in redirects: ${redirects.join(", ")}`);
    }
    expectRedirectToProject(redirects, projectId);

    const { data: project, error } = await getProjectById(session.client, projectId);
    expect(error).toBeNull();
    expect(project?.name).toBe("Contract create project");
    expect(project?.description).toBe("Created via form POST contract test");
  });

  it("redirects invalid create with ?error= and does not add a project row", async () => {
    const { data: beforeList } = await listProjects(session.client);
    const countBefore = beforeList?.length ?? 0;

    const form = new FormData();
    form.set("name", "");

    const { context, redirects } = createAuthenticatedFormContext(session, {
      method: "POST",
      pathname: "/api/projects",
      body: form,
    });

    await postProject(context);

    expectFormErrorRedirect(redirects, "/app/projects/new");

    const { data: afterList } = await listProjects(session.client);
    expect(afterList?.length ?? 0).toBe(countBefore);
  });

  it("updates a project and redirects without error query param", async () => {
    const project = await seedProject(session, { name: "Before update name" });

    const form = new FormData();
    form.set("_action", "update");
    form.set("name", "After update name");

    const { context, redirects } = createAuthenticatedFormContext(session, {
      method: "POST",
      pathname: `/api/projects/${project.id}`,
      params: { id: project.id },
      body: form,
    });

    await postProjectById(context);

    expectRedirectToProject(redirects, project.id);
    expect(redirects.some((url) => url.includes("error="))).toBe(false);

    const { data: updated } = await getProjectById(session.client, project.id);
    expect(updated?.name).toBe("After update name");
  });

  it("deletes a project and redirects to the projects list", async () => {
    const project = await seedProject(session, { name: "Delete me project" });

    const form = new FormData();
    form.set("_action", "delete");

    const { context, redirects } = createAuthenticatedFormContext(session, {
      method: "POST",
      pathname: `/api/projects/${project.id}`,
      params: { id: project.id },
      body: form,
    });

    await postProjectById(context);

    expectRedirectToProjectsList(redirects);

    const { data: deleted } = await getProjectById(session.client, project.id);
    expect(deleted).toBeNull();
  });

  it("redirects invalid _action with ?error= without mutating the project", async () => {
    const project = await seedProject(session, { name: "Invalid action probe" });

    const form = new FormData();
    form.set("_action", "archive");

    const { context, redirects } = createAuthenticatedFormContext(session, {
      method: "POST",
      pathname: `/api/projects/${project.id}`,
      params: { id: project.id },
      body: form,
    });

    await postProjectById(context);

    expectFormErrorRedirect(redirects, `/app/projects/${project.id}`);

    const { data: unchanged } = await getProjectById(session.client, project.id);
    expect(unchanged?.name).toBe("Invalid action probe");
  });
});
