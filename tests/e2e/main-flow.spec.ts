import { expect, test } from "@playwright/test";
import { GUARDRAIL_ACCEPTED } from "../helpers/guardrail-fixtures";
import { fillDomFormField, fillReactField, signInThroughUi, waitForGenerateFormReady } from "./fixtures/auth";

test.describe("US-01 main flow (e2e wiring only)", () => {
  test("login, project, generate with mock AI, and draft history banner", async ({ page }) => {
    test.setTimeout(120_000);

    const changeText = `Balance patch: reduced ${GUARDRAIL_ACCEPTED}.`;
    const projectName = `E2E US-01 ${Date.now()}`;

    await test.step("Sign in", async () => {
      await signInThroughUi(page);
    });

    await test.step("Create project", async () => {
      await page.goto("/app/projects/new");
      await fillDomFormField(page, "#name", projectName);
      await page.getByRole("button", { name: "Create project" }).click();
      await page.waitForURL(/\/app\/projects\/[0-9a-f-]{36}$/);
    });

    await test.step("Open generate form (wait for island hydration)", async () => {
      const generateFormLoaded = waitForGenerateFormReady(page);
      await page.getByRole("link", { name: "Generate" }).click();
      await generateFormLoaded;
      await expect(page.getByRole("heading", { name: "Generate content" })).toBeVisible();
      await expect(page.getByLabel("Use mock AI provider (dev only)")).toBeChecked();
    });

    await test.step("Generate draft with mock AI", async () => {
      await fillReactField(page, "#raw_content", changeText);
      await expect(page.locator("#raw_content")).toHaveValue(changeText);

      const mockGenerationRequest = page.waitForRequest(
        (request) =>
          request.method() === "POST" &&
          request.url().includes("/generation-runs") &&
          request.headers()["x-dev-mock-provider"] === "1",
      );

      await page.getByRole("button", { name: "Generate draft" }).click();
      await mockGenerationRequest;
    });

    await test.step("Assert draft saved to history", async () => {
      await page.waitForURL(/\/drafts\?success=generated$/);
      await expect(page.getByText("Draft saved to history.")).toBeVisible();
      await expect(page.getByText(GUARDRAIL_ACCEPTED)).toBeVisible();
    });
  });
});
