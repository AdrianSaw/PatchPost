import type { APIRoute } from "astro";
import { parseCookieHeader } from "@supabase/ssr";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function clearSupabaseAuthCookies(requestHeaders: Headers, cookies: Parameters<APIRoute>[0]["cookies"]) {
  parseCookieHeader(requestHeaders.get("Cookie") ?? "").forEach(({ name }) => {
    if (name.startsWith("sb-")) {
      cookies.delete(name, { path: "/" });
    }
  });
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (supabase) {
    await supabase.auth.signOut();
  } else {
    clearSupabaseAuthCookies(context.request.headers, context.cookies);
  }
  return context.redirect("/");
};
