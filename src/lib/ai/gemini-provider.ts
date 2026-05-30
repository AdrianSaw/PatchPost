import { classificationResultSchema } from "@/lib/ai/classification";
import { buildClassifyPrompt, buildGeneratePrompt } from "@/lib/ai/prompts";
import {
  GenerationProviderError,
  type ClassifyRequest,
  type ClassifyResult,
  type GenerateRequest,
  type GenerateResult,
  type GenerationProvider,
} from "@/lib/ai/provider";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiContent {
  parts?: { text?: string }[];
}

interface GeminiResponse {
  candidates?: {
    content?: GeminiContent;
  }[];
  error?: {
    message?: string;
    code?: number;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractText(response: GeminiResponse): string {
  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new GenerationProviderError("Gemini returned an empty response", "invalid_response");
  }
  return text.trim();
}

function parseLabeledSections(text: string, labels: string[]): Record<string, string> {
  const sections: Record<string, string> = {};
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    if (!label) {
      continue;
    }
    const nextLabels = labels.slice(index + 1);
    const nextPattern = nextLabels.length > 0 ? `(?:${nextLabels.map((entry) => `${entry}:`).join("|")})` : "$";
    const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\s*${nextPattern}|$)`, "i");
    const match = pattern.exec(text);
    sections[label.toLowerCase()] = match?.[1]?.trim() ?? "";
  }
  return sections;
}

function parseGenerateResult(outputType: GenerateRequest["outputType"], text: string): GenerateResult {
  if (outputType === "instagram_post") {
    const sections = parseLabeledSections(text, ["Caption", "Hashtags"]);
    const content = sections.caption ? sections.caption : text.trim();
    return {
      title: null,
      content,
      hashtags: sections.hashtags || null,
    };
  }

  const sections = parseLabeledSections(text, ["Title", "Body"]);
  const title = sections.title || null;
  const body = sections.body || text.trim();
  return {
    title,
    content: body,
    hashtags: null,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  jsonMode: boolean,
): Promise<string> {
  const trimmedKey = apiKey.trim();
  const url = `${GEMINI_API_BASE}/${model}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": trimmedKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined,
    }),
  });

  if (response.status === 429) {
    throw new GenerationProviderError("Gemini rate limit exceeded", "rate_limit");
  }

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    const message = payload.error?.message ?? `Gemini request failed with status ${String(response.status)}`;
    throw new GenerationProviderError(message, "api_error");
  }

  return extractText(payload);
}

async function callGeminiWithRetry(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  jsonMode: boolean,
): Promise<string> {
  try {
    return await callGemini(apiKey, model, system, user, jsonMode);
  } catch (error) {
    if (error instanceof GenerationProviderError && error.code === "rate_limit") {
      await sleep(1000);
      return callGemini(apiKey, model, system, user, jsonMode);
    }
    throw error;
  }
}

function parseClassificationJson(text: string): ClassifyResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    throw new GenerationProviderError("Gemini classification response was not valid JSON", "invalid_response", error);
  }

  const result = classificationResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new GenerationProviderError(
      result.error.issues.map((issue) => issue.message).join("; "),
      "invalid_response",
      result.error,
    );
  }

  return result.data;
}

export function createGeminiProvider(apiKey: string, model = DEFAULT_GEMINI_MODEL): GenerationProvider {
  return {
    name: "gemini",
    model,

    async classify(input: ClassifyRequest): Promise<ClassifyResult> {
      const prompt = buildClassifyPrompt(input.project, input.changeInput);
      try {
        const text = await callGeminiWithRetry(apiKey, model, prompt.system, prompt.user, true);
        return parseClassificationJson(text);
      } catch (error) {
        if (error instanceof GenerationProviderError && error.code === "invalid_response") {
          const retryText = await callGeminiWithRetry(apiKey, model, prompt.system, prompt.user, true);
          return parseClassificationJson(retryText);
        }
        throw error;
      }
    },

    async generate(input: GenerateRequest): Promise<GenerateResult> {
      const prompt = buildGeneratePrompt(
        input.project,
        input.outputType,
        input.tone,
        input.classifiedItems,
        input.outputLanguage,
      );
      const text = await callGeminiWithRetry(apiKey, model, prompt.system, prompt.user, false);
      return parseGenerateResult(input.outputType, text);
    },
  };
}

export { DEFAULT_GEMINI_MODEL };
