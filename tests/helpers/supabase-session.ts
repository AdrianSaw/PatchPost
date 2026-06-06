import { createServerClient } from "@supabase/ssr";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { cookieHeaderFromStore } from "./mock-cookies";

export interface TestUserSession {
  email: string;
  password: string;
  user: User;
  session: Session;
  client: SupabaseClient;
  cookieHeader: string;
}

function requireSupabaseConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY must be set for integration tests.");
  }
  return { url, key };
}

/** Provision a unique auth user via the public Auth API (local Supabase only). */
export async function createTestUser(label: string): Promise<TestUserSession> {
  const email = `patchpost-test-${label}-${Date.now()}@example.com`;
  const password = `Test_${crypto.randomUUID()}`;
  return signInAs(email, password, { signUpFirst: true });
}

/** Sign in (optionally sign up first) and return a session-scoped client plus Cookie header. */
export async function signInAs(
  email: string,
  password: string,
  options?: { signUpFirst?: boolean },
): Promise<TestUserSession> {
  const { url, key } = requireSupabaseConfig();
  const cookieJar = new Map<string, string>();

  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          cookieJar.set(name, value);
        }
      },
    },
  });

  if (options?.signUpFirst) {
    const { error: signUpError } = await client.auth.signUp({ email, password });
    if (signUpError) {
      throw signUpError;
    }
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }

  const cookieHeader = cookieHeaderFromStore(cookieJar);

  return {
    email,
    password,
    user: data.user,
    session: data.session,
    client,
    cookieHeader,
  };
}
