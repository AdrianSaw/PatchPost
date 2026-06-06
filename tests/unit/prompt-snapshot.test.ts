import { describe, expect, it } from "vitest";
import { parsePromptSnapshot } from "@/lib/generation/prompt-snapshot";

describe("parsePromptSnapshot", () => {
  it("parses valid v1 snapshot JSON", () => {
    const raw = JSON.stringify({
      v: 1,
      provider: "mock",
      model: null,
      outputLanguage: "en",
      classifiedItems: [
        {
          source: "Balance patch: reduced rifle-damage-10pct.",
          classification: "balance",
          visibility: "player_facing",
          reason: "Visible balance change",
          suggested_public_summary: "Balance patch: reduced rifle-damage-10pct.",
        },
      ],
    });

    const parsed = parsePromptSnapshot(raw);

    expect(parsed).not.toBeNull();
    expect(parsed?.classifiedItems).toHaveLength(1);
    expect(parsed?.outputLanguage).toBe("en");
  });

  it("returns null for invalid JSON", () => {
    expect(parsePromptSnapshot("{not-json")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parsePromptSnapshot(null)).toBeNull();
    expect(parsePromptSnapshot("")).toBeNull();
  });
});
