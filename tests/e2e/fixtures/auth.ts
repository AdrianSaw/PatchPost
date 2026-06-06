import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

const AUTH_FILE = path.join(process.cwd(), "tests/e2e/.auth/user.json");

export interface E2eCredentials {
  email: string;
  password: string;
}

export function readE2eCredentials(): E2eCredentials {
  try {
    const raw = readFileSync(AUTH_FILE, "utf8");
    const parsed = JSON.parse(raw) as E2eCredentials;
    if (!parsed.email || !parsed.password) {
      throw new Error("invalid shape");
    }
    return parsed;
  } catch {
    throw new Error(
      "E2E credentials missing. Run with local Supabase (.env.local + SUPABASE_SERVICE_ROLE_KEY) so global setup can provision a user.",
    );
  }
}

/** Sign in through the public sign-in form (browser session cookies). */
export async function signInThroughUi(page: Page): Promise<E2eCredentials> {
  const credentials = readE2eCredentials();
  await page.goto("/auth/signin");
  await page.locator("#email").click();
  await page.locator("#email").pressSequentially(credentials.email);
  await page.locator("#password").click();
  await page.locator("#password").pressSequentially(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app/projects**");
  return credentials;
}
