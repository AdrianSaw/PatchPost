import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import "../setup";
import { assertSupabaseReachable, hasLocalSupabaseConfig, SUPABASE_PREREQUISITE_MESSAGE } from "../setup";
import { createTestUser } from "../helpers/supabase-session";

export default async function globalSetup(): Promise<void> {
  if (!hasLocalSupabaseConfig()) {
    throw new Error(SUPABASE_PREREQUISITE_MESSAGE);
  }

  await assertSupabaseReachable();

  const session = await createTestUser("e2e-seed");
  const authDir = path.join(process.cwd(), "tests/e2e/.auth");
  mkdirSync(authDir, { recursive: true });
  writeFileSync(
    path.join(authDir, "user.json"),
    JSON.stringify({ email: session.email, password: session.password }),
    "utf8",
  );
}
