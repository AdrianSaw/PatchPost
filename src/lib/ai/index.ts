export {
  classificationCategorySchema,
  classificationItemSchema,
  classificationResultSchema,
  classificationVisibilitySchema,
} from "@/lib/ai/classification";
export type {
  ClassificationCategory,
  ClassificationItem,
  ClassificationResult,
  ClassificationVisibility,
} from "@/lib/ai/classification";
export { getGenerationProvider } from "@/lib/ai/factory";
export { createGeminiProvider, DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini-provider";
export { mockProvider } from "@/lib/ai/mock-provider";
export { buildClassifyPrompt, buildGeneratePrompt } from "@/lib/ai/prompts";
export type { PromptParts } from "@/lib/ai/prompts";
export {
  GenerationProviderError,
  type ClassifyRequest,
  type ClassifyResult,
  type GenerateRequest,
  type GenerateResult,
  type GenerationProvider,
  type OutputLanguage,
} from "@/lib/ai/provider";
