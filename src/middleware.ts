import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";

/** Exact paths reachable without a session. Add new public pages here explicitly. */
const PUBLIC_EXACT = ["/", "/favicon.ico"];

/** Path prefixes reachable without a session (auth entry + signin/signout API). */
const PUBLIC_PREFIXES = ["/auth/signin", "/api/auth/signin", "/api/auth/signout"];

/** Asset paths that must not trigger auth redirects. */
const STATIC_PREFIXES = ["/_astro/", "/sitemap"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) {
    return true;
  }
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname === "/auth/signup" || pathname.startsWith("/auth/confirm-email")) {
    return context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    context.locals.user = error ? null : (user ?? null);
  } else {
    context.locals.user = null;
  }

  if (!isPublicPath(pathname) && !context.locals.user) {
    return context.redirect("/auth/signin");
  }

  if (pathname === "/dashboard") {
    return context.redirect("/app/projects");
  }

  return next();
});
