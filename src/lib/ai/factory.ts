import { AI_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL } from "astro:env/server";
import { createGeminiProvider, DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini-provider";
import { mockProvider } from "@/lib/ai/mock-provider";
import { GenerationProviderError, type GenerationProvider } from "@/lib/ai/provider";

function warnMockFallback(reason: string): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- intentional dev-only provider fallback signal
    console.warn(`[generation] Using mock provider: ${reason}`);
  }
}

export function getGenerationProvider(): GenerationProvider {
  if (AI_PROVIDER === "mock") {
    return mockProvider;
  }

  if (GEMINI_API_KEY) {
    const trimmedModel = GEMINI_MODEL?.trim();
    const model = trimmedModel && trimmedModel.length > 0 ? trimmedModel : DEFAULT_GEMINI_MODEL;
    return createGeminiProvider(GEMINI_API_KEY, model);
  }

  if (import.meta.env.PROD) {
    throw new GenerationProviderError(
      "AI provider is not configured. Set GEMINI_API_KEY or AI_PROVIDER=mock.",
      "api_error",
    );
  }

  warnMockFallback("GEMINI_API_KEY is not configured");
  return mockProvider;
}
