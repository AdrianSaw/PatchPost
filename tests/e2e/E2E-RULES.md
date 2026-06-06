# E2E Testing Rules (PatchPost)

Agent-readable rules for `tests/e2e/`. Model generated specs on `00-seed.spec.ts` and these constraints.

- Use `getByRole`, `getByLabel`, `getByText` as primary locators. Fall back to `getByTestId` only when roles are ambiguous.
- Never use CSS selectors, XPath, or DOM structure for locating elements (no `#id` in spec files).
- Each test must be independently runnable — no shared state between tests.
- Never use `page.waitForTimeout()`. Wait for specific conditions: `toBeVisible()`, `waitForURL()`, `waitForResponse()`.
- Assert the business outcome tied to a `test-plan.md` risk, not implementation details.
- Use unique identifiers (e.g. `Date.now()` suffix) for test data to avoid collisions. Cleanup optional for local Supabase MVP.
- Prefer `storageState` for auth when wired; until then, reuse `signInThroughUi()` from `fixtures/auth.ts` (same as seed harness).
- Mock external AI at the network boundary (`x-dev-mock-provider: 1` in DEV); keep auth, routing, and Supabase real.

Reference: `context/foundation/test-plan.md` §6.3, `.cursor/skills/10x-e2e/references/e2e-anti-patterns.md`.
