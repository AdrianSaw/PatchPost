import type { APIContext } from "astro";
import { createMockCookies } from "./mock-cookies";

export interface ApiContextOptions {
  method?: string;
  pathname?: string;
  params?: Record<string, string | undefined>;
  headers?: HeadersInit;
  body?: BodyInit | null;
  cookieHeader?: string;
  user?: App.Locals["user"];
}

export interface ApiContextResult {
  context: APIContext;
  redirects: string[];
}

/** Build a minimal APIContext for importing Astro APIRoute handlers in tests. */
export function createApiContext(options: ApiContextOptions = {}): ApiContextResult {
  const pathname = options.pathname ?? "/api/projects";
  const url = new URL(`http://localhost${pathname}`);
  const redirects: string[] = [];

  const headers = new Headers(options.headers);
  if (options.cookieHeader) {
    headers.set("Cookie", options.cookieHeader);
  }

  const request = new Request(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ?? null,
  });

  const cookies = createMockCookies();

  const context = {
    request,
    url,
    params: options.params ?? {},
    cookies,
    locals: { user: options.user ?? null },
    redirect(target: string) {
      redirects.push(target);
      return new Response(null, {
        status: 302,
        headers: { Location: target },
      });
    },
  } as APIContext;

  return { context, redirects };
}
