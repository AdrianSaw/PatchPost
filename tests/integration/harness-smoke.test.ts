import { describe, expect, it, vi } from "vitest";
import { assertSupabaseReachable, SUPABASE_PREREQUISITE_MESSAGE } from "../setup";
import { invokeMiddleware } from "../helpers/middleware-request";

describe("integration harness", () => {
  it("exports a clear Supabase prerequisite message", () => {
    expect(SUPABASE_PREREQUISITE_MESSAGE).toContain("npm run supabase:start");
  });

  it("passes when local Supabase is up, or fails with a clear prerequisite message", async () => {
    try {
      await assertSupabaseReachable();
      expect(process.env.SUPABASE_URL).toMatch(/127\.0\.0\.1|localhost/);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("supabase:start");
    }
  });

  it("middleware returns 401 JSON for unauthenticated API mutation", async () => {
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_KEY", "test-publishable-key");

    const { response, nextCalled } = await invokeMiddleware({
      pathname: "/api/projects",
      method: "POST",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Not authenticated" });
    expect(nextCalled).toBe(false);
  });
});
