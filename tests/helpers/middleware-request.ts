import type { MiddlewareHandler } from "astro";
import { onRequest } from "@/middleware";
import { createMockCookies } from "./mock-cookies";

export interface MiddlewareRequestOptions {
  pathname: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  cookieHeader?: string;
}

export interface MiddlewareRequestResult {
  response: Response;
  nextCalled: boolean;
  redirects: string[];
  locals: App.Locals;
}

/** Invoke auth middleware with a synthetic request (no Astro dev server). */
export async function invokeMiddleware(options: MiddlewareRequestOptions): Promise<MiddlewareRequestResult> {
  const url = new URL(`http://localhost${options.pathname}`);
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
  const redirects: string[] = [];
  let nextCalled = false;

  const context = {
    url,
    request,
    cookies,
    locals: { user: null },
    redirect(target: string, status = 302) {
      redirects.push(target);
      return new Response(null, { status, headers: { Location: target } });
    },
  };

  const next: MiddlewareHandler = () => {
    nextCalled = true;
    return Promise.resolve(new Response("ok", { status: 200 }));
  };

  const response = await onRequest(context, next);

  return {
    response,
    nextCalled,
    redirects,
    locals: context.locals,
  };
}
