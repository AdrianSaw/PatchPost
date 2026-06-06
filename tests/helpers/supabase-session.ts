import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

async function provisionAuthUser(
  url: string,
  email: string,
  password: string,
  publicClient: SupabaseClient,
): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const admin = createSupabaseClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      throw error;
    }
    return;
  }

  const { error: signUpError } = await publicClient.auth.signUp({ email, password });
  if (signUpError) {
    throw signUpError;
  }
}

/** Provision a unique auth user (Admin API when signup is disabled, else public signUp). */
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
    await provisionAuthUser(url, email, password, client);
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
