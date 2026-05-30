import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const GENERIC_SIGNIN_ERROR = "Invalid login credentials";

const signInSchema = z.object({
  email: z.preprocess((val) => (typeof val === "string" ? val.trim() : val), z.email()),
  password: z.string().min(1),
});

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const parsed = signInSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });

  if (!parsed.success) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent(GENERIC_SIGNIN_ERROR)}`);
  }

  const { email, password } = parsed.data;

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent("Supabase is not configured")}`);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent(GENERIC_SIGNIN_ERROR)}`);
  }

  return context.redirect("/app/projects");
};
