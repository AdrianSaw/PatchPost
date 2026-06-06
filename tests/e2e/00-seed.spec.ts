import { expect, test } from "@playwright/test";
import { readE2eCredentials, signInThroughUi } from "./fixtures/auth";

test.describe("e2e harness smoke", () => {
  test("signs in at /auth/signin and lands on /app/projects", async ({ page }) => {
    const { email } = readE2eCredentials();
    await signInThroughUi(page);
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });
});
