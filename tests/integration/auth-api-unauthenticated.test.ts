import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiContext } from "../helpers/api-context";
import { invokeMiddleware } from "../helpers/middleware-request";
import { POST as postProjectById } from "@/pages/api/projects/[id]";
import { POST as postChangeInputs } from "@/pages/api/projects/[id]/change-inputs";

const projectId = crypto.randomUUID();
const draftId = crypto.randomUUID();

const MUTATION_ROUTES = [
  { method: "POST", pathname: "/api/projects" },
  { method: "POST", pathname: `/api/projects/${projectId}` },
  { method: "POST", pathname: `/api/projects/${projectId}/change-inputs` },
  { method: "POST", pathname: `/api/projects/${projectId}/generation-runs` },
  { method: "PATCH", pathname: `/api/projects/${projectId}/drafts/${draftId}` },
] as const;

async function expectMiddlewareBlocksMutation(method: string, pathname: string): Promise<void> {
  const { response, nextCalled } = await invokeMiddleware({ pathname, method });
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "Not authenticated" });
  expect(nextCalled).toBe(false);
}

describe("unauthenticated API boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_KEY", "test-publishable-key");
  });

  describe("middleware auth matrix (primary gate)", () => {
    it.each(MUTATION_ROUTES)("blocks $method $pathname without session", async ({ method, pathname }) => {
      await expectMiddlewareBlocksMutation(method, pathname);
    });
  });

  describe("handler regression guards (middleware bypass)", () => {
    it("POST change-inputs returns 401 JSON without mutating when invoked directly", async () => {
      const targetProjectId = crypto.randomUUID();
      const { context } = createApiContext({
        method: "POST",
        pathname: `/api/projects/${targetProjectId}/change-inputs`,
        params: { id: targetProjectId },
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_content: "unauthenticated probe" }),
      });

      const response = await postChangeInputs(context);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Not authenticated" });
    });

    it("POST projects/[id] redirects to sign-in without mutating when invoked directly", async () => {
      const targetProjectId = crypto.randomUUID();
      const form = new FormData();
      form.set("_action", "update");
      form.set("name", "Should not persist");

      const { context, redirects } = createApiContext({
        method: "POST",
        pathname: `/api/projects/${targetProjectId}`,
        params: { id: targetProjectId },
        body: form,
      });

      await postProjectById(context);

      expect(redirects).toContain("/auth/signin");
    });
  });
});
