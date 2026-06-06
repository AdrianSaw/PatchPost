import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ws from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = ws as unknown as typeof WebSocket;
}

export const SUPABASE_PREREQUISITE_MESSAGE =
  "Integration tests require local Supabase. Run: npm run supabase:start — then copy .env.local.example → .env.local with the Publishable key.";

function loadEnvFile(filePath: string, override = false): void {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"), true);

function isLocalSupabaseUrl(url: string): boolean {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

function missingSupabaseEnv(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  return !url || !key || key.includes("<Publishable");
}

/** True when `.env.local` points at local Docker Supabase (integration tests that need DB). */
export function hasLocalSupabaseConfig(): boolean {
  const url = process.env.SUPABASE_URL;
  if (!url || missingSupabaseEnv()) {
    return false;
  }
  return isLocalSupabaseUrl(url);
}

/** Fail fast when local Supabase is not configured or unreachable. */
export async function assertSupabaseReachable(): Promise<void> {
  if (missingSupabaseEnv()) {
    throw new Error(SUPABASE_PREREQUISITE_MESSAGE);
  }

  const url = process.env.SUPABASE_URL;
  if (!url || !isLocalSupabaseUrl(url)) {
    throw new Error(`${SUPABASE_PREREQUISITE_MESSAGE} (set SUPABASE_URL to http://127.0.0.1:54321 in .env.local)`);
  }

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error("health check failed");
    }
  } catch {
    throw new Error(`${SUPABASE_PREREQUISITE_MESSAGE} (cannot reach ${url})`);
  }
}
