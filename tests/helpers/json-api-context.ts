import type { TestUserSession } from "./supabase-session";
import { createApiContext, type ApiContextResult } from "./api-context";

export interface JsonApiContextOptions {
  method?: string;
  pathname: string;
  params?: Record<string, string | undefined>;
  body?: unknown;
  extraHeaders?: HeadersInit;
  cookieHeader?: string;
}

/** Build APIContext for JSON POST/PATCH handlers with Content-Type and serialized body. */
export function createJsonApiContext(session: TestUserSession, options: JsonApiContextOptions): ApiContextResult {
  const headers = new Headers(options.extraHeaders);
  headers.set("Content-Type", "application/json");

  return createApiContext({
    method: options.method ?? "POST",
    pathname: options.pathname,
    params: options.params,
    cookieHeader: options.cookieHeader ?? session.cookieHeader,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : null,
  });
}
