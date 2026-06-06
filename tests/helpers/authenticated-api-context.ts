import type { TestUserSession } from "./supabase-session";
import { createApiContext, type ApiContextOptions, type ApiContextResult } from "./api-context";

/** Form POST/PATCH context with session cookies pre-applied. */
export function createAuthenticatedFormContext(
  session: TestUserSession,
  options: Omit<ApiContextOptions, "cookieHeader">,
): ApiContextResult {
  return createApiContext({
    ...options,
    cookieHeader: session.cookieHeader,
  });
}
