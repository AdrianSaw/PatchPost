/**
 * E2E — test-plan Risk #5 / US-01 (manual input → generate → draft in history).
 * Proves cross-boundary wiring: auth → form POST → generate API → persisted draft UI.
 * Seed exemplar: tests/e2e/00-seed.spec.ts | Rules: tests/e2e/E2E-RULES.md
 * Change: context/changes/testing-ci-gates-e2e/
 */
import { expect, test } from "@playwright/test";
import { GUARDRAIL_ACCEPTED } from "../helpers/guardrail-fixtures";
import { fillReactField, signInThroughUi, waitForGenerateFormReady } from "./fixtures/auth";

test.describe("Risk #5 — generate persists draft to history (US-01 wiring)", () => {
  test("manual input with mock AI survives redirect and page reload", async ({ page }) => {
    test.setTimeout(120_000);

    const changeText = `Balance patch: reduced ${GUARDRAIL_ACCEPTED}.`;
    const projectName = `E2E US-01 ${Date.now()}`;

    // Sign in (public form → session cookie → /app/projects)
    await test.step("Sign in", async () => {
      await signInThroughUi(page);
    });

    // Create project (native form POST → project detail)
    await test.step("Create project", async () => {
      await page.goto("/app/projects/new");
      await fillReactField(page.getByRole("textbox", { name: "Project name" }), projectName);
      await page.getByRole("button", { name: "Create project" }).click();
      await page.waitForURL(/\/app\/projects\/[0-9a-f-]{36}$/);
    });

    // Open generate form (React island must hydrate before fetch-based submit)
    await test.step("Open generate form (wait for island hydration)", async () => {
      const generateFormLoaded = waitForGenerateFormReady(page);
      await page.getByRole("link", { name: "Generate" }).click();
      await generateFormLoaded;
      await expect(page.getByRole("heading", { name: "Generate content" })).toBeVisible();
      await expect(page.getByLabel("Use mock AI provider (dev only)")).toBeChecked();
    });

    // Generate draft (mock provider header → persisted output)
    await test.step("Generate draft with mock AI", async () => {
      const changesField = page.getByRole("textbox", { name: "Changes" });
      await fillReactField(changesField, changeText);
      await expect(changesField).toHaveValue(changeText);

      const mockGenerationRequest = page.waitForRequest(
        (request) =>
          request.method() === "POST" &&
          request.url().includes("/generation-runs") &&
          request.headers()["x-dev-mock-provider"] === "1",
      );

      await page.getByRole("button", { name: "Generate draft" }).click();
      await mockGenerationRequest;
    });

    // Draft appears in history (banner + snippet); reload proves persistence (Risk #5)
    await test.step("Assert draft saved to history and survives reload", async () => {
      await page.waitForURL(/\/drafts\?success=generated$/);
      await expect(page.getByText("Draft saved to history.")).toBeVisible();
      await expect(page.getByText(GUARDRAIL_ACCEPTED)).toBeVisible();

      await page.reload();
      await expect(page.getByText(GUARDRAIL_ACCEPTED)).toBeVisible();
    });
  });
});
