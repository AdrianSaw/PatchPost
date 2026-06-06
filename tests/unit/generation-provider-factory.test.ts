import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({
  get AI_PROVIDER() {
    return process.env.AI_PROVIDER ?? "";
  },
  get GEMINI_API_KEY() {
    return process.env.GEMINI_API_KEY ?? "";
  },
  get GEMINI_MODEL() {
    return process.env.GEMINI_MODEL ?? "";
  },
  get SUPABASE_URL() {
    return process.env.SUPABASE_URL ?? "";
  },
  get SUPABASE_KEY() {
    return process.env.SUPABASE_KEY ?? "";
  },
}));

import { getGenerationProvider } from "@/lib/ai/factory";
import { GenerationProviderError } from "@/lib/ai/provider";

describe("getGenerationProvider", () => {
  const originalProd = import.meta.env.PROD;

  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GEMINI_MODEL", "");
  });

  afterEach(() => {
    import.meta.env.PROD = originalProd;
    vi.unstubAllEnvs();
  });

  it("returns mock provider when AI_PROVIDER is mock", () => {
    vi.stubEnv("AI_PROVIDER", "mock");

    expect(getGenerationProvider().name).toBe("mock");
  });

  it("returns gemini provider when GEMINI_API_KEY is set", () => {
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");

    expect(getGenerationProvider().name).toBe("gemini");
  });

  it("falls back to mock in dev when no key is configured", () => {
    import.meta.env.PROD = false;

    expect(getGenerationProvider().name).toBe("mock");
  });

  it("throws in production when no key or mock provider is configured", () => {
    import.meta.env.PROD = true;

    expect(() => getGenerationProvider()).toThrow(GenerationProviderError);
    expect(() => getGenerationProvider()).toThrow(/not configured/i);
  });
});
