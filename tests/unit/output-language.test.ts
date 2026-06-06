import { describe, expect, it } from "vitest";
import { detectOutputLanguage } from "@/lib/ai/output-language";

describe("detectOutputLanguage", () => {
  it("detects Polish from diacritics", () => {
    expect(detectOutputLanguage("Naprawiono błąd kolizji w poziomie 3.")).toBe("pl");
  });

  it("detects English for ASCII-only balance patch text", () => {
    expect(detectOutputLanguage("Balance patch: reduced rifle damage by 10%.")).toBe("en");
  });
});
