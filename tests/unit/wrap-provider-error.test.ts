import { describe, expect, it } from "vitest";
import { GenerationProviderError } from "@/lib/ai/provider";
import { GenerationWorkflowError, wrapProviderError } from "@/lib/services/generation-workflow";

describe("wrapProviderError", () => {
  it("maps rate_limit to provider_rate_limit", () => {
    const wrapped = wrapProviderError(new GenerationProviderError("Too many requests", "rate_limit"));

    expect(wrapped).toBeInstanceOf(GenerationWorkflowError);
    expect(wrapped.code).toBe("provider_rate_limit");
    expect(wrapped.message).toMatch(/rate limit/i);
  });

  it("maps api_error to provider_error", () => {
    const wrapped = wrapProviderError(new GenerationProviderError("AI provider is not configured", "api_error"));

    expect(wrapped.code).toBe("provider_error");
  });

  it("maps invalid_response to provider_error", () => {
    const wrapped = wrapProviderError(new GenerationProviderError("Invalid model JSON", "invalid_response"));

    expect(wrapped.code).toBe("provider_error");
  });

  it("maps unknown errors to provider_error", () => {
    const wrapped = wrapProviderError(new Error("Network timeout"));

    expect(wrapped.code).toBe("provider_error");
    expect(wrapped.message).toMatch(/generation failed/i);
  });
});
