import { describe, expect, it } from "vitest";
import { createAuthenticatedFormContext } from "../helpers/authenticated-api-context";
import { createJsonApiContext } from "../helpers/json-api-context";
import {
  expectFormErrorRedirect,
  expectRedirectToProject,
  expectRedirectToProjectsList,
  extractProjectIdFromRedirects,
} from "../helpers/redirect-assertions";
import { seedChangeInput, seedDraftViaGeneration, seedProject } from "../helpers/seed-fixtures";

describe("test helpers import", () => {
  it("exports api context helpers", () => {
    expect(typeof createJsonApiContext).toBe("function");
    expect(typeof createAuthenticatedFormContext).toBe("function");
  });

  it("exports seed fixtures", () => {
    expect(typeof seedProject).toBe("function");
    expect(typeof seedChangeInput).toBe("function");
    expect(typeof seedDraftViaGeneration).toBe("function");
  });

  it("exports redirect assertion helpers", () => {
    expect(typeof expectFormErrorRedirect).toBe("function");
    expect(typeof expectRedirectToProject).toBe("function");
    expect(typeof expectRedirectToProjectsList).toBe("function");
    expect(typeof extractProjectIdFromRedirects).toBe("function");
  });

  it("redirect helpers behave on sample data", () => {
    const redirects = ["/app/projects/new?error=bad", "/app/projects/550e8400-e29b-41d4-a716-446655440000"];
    expectFormErrorRedirect(redirects, "/app/projects/new");
    expectRedirectToProject(redirects, "550e8400-e29b-41d4-a716-446655440000");
    expect(extractProjectIdFromRedirects(redirects)).toBe("550e8400-e29b-41d4-a716-446655440000");
    expectRedirectToProjectsList(["/app/projects"]);
  });
});
