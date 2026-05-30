import { classificationResultSchema } from "@/lib/ai/classification";
import type {
  ClassifyRequest,
  ClassifyResult,
  GenerateRequest,
  GenerateResult,
  GenerationProvider,
} from "@/lib/ai/provider";

function firstChangeLine(rawContent: string): string {
  const line = rawContent
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find(Boolean);
  return line ?? rawContent.trim();
}

function buildMockClassification(rawContent: string): ClassifyResult {
  const source = firstChangeLine(rawContent);
  const result = classificationResultSchema.parse({
    items: [
      {
        source,
        classification: "bugfix",
        visibility: "player_facing",
        reason: "Mock provider inferred a player-facing fix from the supplied change text.",
        suggested_public_summary: source,
      },
    ],
  });
  return result;
}

function buildMockGenerate(input: GenerateRequest): GenerateResult {
  const summary = input.classifiedItems.map((item) => item.suggested_public_summary).join("; ");
  const projectName = input.project.name;

  switch (input.outputType) {
    case "instagram_post":
      return {
        title: null,
        content: `[Mock] ${summary}`,
        hashtags: `#${projectName.replace(/\s+/g, "")} #indiegame`,
      };
    case "discord_update":
      return {
        title: `${projectName} update`,
        content: `[Mock Discord] Hey everyone — ${summary}`,
        hashtags: null,
      };
    case "steam_news":
      return {
        title: `${projectName} — latest update`,
        content: `[Mock Steam news]\n\n${summary}`,
        hashtags: null,
      };
    case "devlog_summary":
    case "changelog":
    default:
      return {
        title: `${projectName} changelog`,
        content: `[Mock changelog]\n\n- ${summary}`,
        hashtags: null,
      };
  }
}

export const mockProvider: GenerationProvider = {
  name: "mock",

  classify(input: ClassifyRequest): Promise<ClassifyResult> {
    return Promise.resolve(buildMockClassification(input.changeInput.raw_content));
  },

  generate(input: GenerateRequest): Promise<GenerateResult> {
    return Promise.resolve(buildMockGenerate(input));
  },
};
