import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

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

/** Wait until a React island has attached handlers to `field`. */
export async function waitForReactHydration(field: Locator): Promise<void> {
  await field.waitFor({ state: "visible" });
  await expect(async () => {
    const hydrated = await field.evaluate((element) =>
      Object.keys(element).some((key) => key.startsWith("__reactFiber$") || key.startsWith("__reactProps$")),
    );
    expect(hydrated).toBe(true);
  }).toPass({ timeout: 15_000 });
}

/** Wait for GenerateForm island + React handlers (fetch-based submit requires hydration). */
export function waitForGenerateFormReady(page: Page): Promise<void> {
  const changesField = page.getByRole("textbox", { name: "Changes" });
  return (async () => {
    await page.waitForURL(/\/generate/, { timeout: 30_000 });
    await expect(changesField).toBeVisible();
    await waitForReactHydration(changesField);
  })();
}

/** Fill a React controlled field after the island has hydrated. */
export async function fillReactField(field: Locator, value: string): Promise<void> {
  await waitForReactHydration(field);
  await field.click();

  const tagName = await field.evaluate((element) => element.tagName.toLowerCase());
  if (tagName === "textarea") {
    await field.pressSequentially(value);
    return;
  }

  await field.evaluate((element, text) => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (descriptor?.set) {
      descriptor.set.call(element, text);
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function fillControlledInput(field: Locator, value: string): Promise<void> {
  await field.waitFor({ state: "visible" });
  await field.click();
  await field.evaluate((element, text) => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (descriptor?.set) {
      descriptor.set.call(element, text);
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

/** Sign in through the public sign-in form (browser session cookies). */
export async function signInThroughUi(page: Page): Promise<E2eCredentials> {
  const credentials = readE2eCredentials();
  await page.goto("/auth/signin");
  const emailField = page.getByRole("textbox", { name: "Email" });
  await waitForReactHydration(emailField);
  await fillControlledInput(emailField, credentials.email);
  await fillControlledInput(page.getByRole("textbox", { name: "Password" }), credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app/projects**");
  return credentials;
}
