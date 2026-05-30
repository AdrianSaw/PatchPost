import type { ChangeInput, DefaultTone, OutputType, Project } from "@/types";
import type { ClassificationItem } from "@/lib/ai/classification";

export type OutputLanguage = "pl" | "en";

export interface ClassifyRequest {
  project: Project;
  changeInput: ChangeInput;
}

export interface ClassifyResult {
  items: ClassificationItem[];
}

export interface GenerateRequest {
  project: Project;
  outputType: OutputType;
  tone: DefaultTone;
  classifiedItems: ClassificationItem[];
  outputLanguage: OutputLanguage;
}

export interface GenerateResult {
  title: string | null;
  content: string;
  hashtags: string | null;
}

export interface GenerationProvider {
  readonly name: string;
  readonly model: string | null;
  classify(input: ClassifyRequest): Promise<ClassifyResult>;
  generate(input: GenerateRequest): Promise<GenerateResult>;
}

export class GenerationProviderError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_response" | "rate_limit" | "api_error",
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GenerationProviderError";
  }
}
