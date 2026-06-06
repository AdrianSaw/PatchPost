import { describe, expect, it } from "vitest";
import { classificationResultSchema } from "@/lib/ai/classification";
import { normalizeClassificationPayload } from "@/lib/ai/gemini-provider";

const validItem = {
  source: "Balance patch: reduced rifle-damage-10pct.",
  classification: "balance",
  visibility: "player_facing",
  reason: "Weapon balance change visible to players.",
  suggested_public_summary: "Rifle damage reduced by 10%.",
};

describe("normalizeClassificationPayload", () => {
  it("trims string fields and passes schema validation", () => {
    const normalized = normalizeClassificationPayload({
      items: [
        {
          ...validItem,
          source: `  ${validItem.source}  `,
          reason: `  ${validItem.reason}  `,
        },
      ],
    });

    const result = classificationResultSchema.safeParse(normalized);
    expect(result.success).toBe(true);
  });

  it("rejects null reason and summary after normalization", () => {
    const normalized = normalizeClassificationPayload({
      items: [{ ...validItem, reason: null, suggested_public_summary: null }],
    });

    const result = classificationResultSchema.safeParse(normalized);
    expect(result.success).toBe(false);
  });

  it("rejects empty source after normalization", () => {
    const normalized = normalizeClassificationPayload({
      items: [{ ...validItem, source: "   " }],
    });

    const result = classificationResultSchema.safeParse(normalized);
    expect(result.success).toBe(false);
  });
});
