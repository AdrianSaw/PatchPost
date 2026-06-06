import type { MiddlewareHandler } from "astro";

/** Pass-through so middleware modules can be imported in Vitest without Astro runtime. */
export function defineMiddleware(fn: MiddlewareHandler): MiddlewareHandler {
  return fn;
}
