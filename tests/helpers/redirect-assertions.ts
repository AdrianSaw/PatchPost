import { expect } from "vitest";

/** Assert a redirect URL under pathPrefix includes ?error= (presence-only oracle). */
export function expectFormErrorRedirect(redirects: string[], pathPrefix: string): void {
  const match = redirects.find((url) => url.startsWith(pathPrefix) && url.includes("?error="));
  expect(match, `Expected error redirect under ${pathPrefix}, got: ${redirects.join(", ")}`).toBeDefined();
}

/** Assert handler redirected to a project detail page. */
export function expectRedirectToProject(redirects: string[], projectId: string): void {
  expect(redirects).toContain(`/app/projects/${projectId}`);
}

/** Assert handler redirected to the projects list. */
export function expectRedirectToProjectsList(redirects: string[]): void {
  expect(redirects).toContain("/app/projects");
}

/** Extract project UUID from a success redirect like /app/projects/{uuid}. */
export function extractProjectIdFromRedirects(redirects: string[]): string | null {
  for (const url of redirects) {
    const path = url.split("?")[0] ?? "";
    const match = /^\/app\/projects\/([0-9a-f-]{36})$/.exec(path);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}
