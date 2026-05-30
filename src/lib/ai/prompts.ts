import type { ClassificationItem } from "@/lib/ai/classification";
import type { OutputLanguage } from "@/lib/ai/provider";
import type { ChangeInput, DefaultTone, OutputType, Project } from "@/types";

export interface PromptParts {
  system: string;
  user: string;
}

const CLASSIFY_SYSTEM = `You are a game development communication assistant.
Your task is to classify technical project changes into player-facing communication categories.

Rules:
- Do not invent features.
- If a commit is vague, mark it as unclear.
- Distinguish internal technical work from player-facing changes.
- Use only the provided input.`;

const CHANGELOG_SYSTEM = `You are a game communication assistant creating player-facing changelogs.

Rules:
- Use only provided classified changes.
- Group changes by category.
- Keep it clear and honest.
- Do not invent content.
- Do not mention internal implementation details unless relevant to players.`;

const SOCIAL_SYSTEM = `You write short social media posts for indie game development updates.

Rules:
- Use a strong opening line.
- Keep it concise.
- Focus on visible player-facing changes.
- Avoid fake hype.
- Do not invent features.
- Include optional hashtags.`;

const DISCORD_SYSTEM = `You write Discord community updates for indie game development.

Rules:
- Use a direct, community-facing tone — a dev speaking to players.
- Keep it conversational; it can be slightly informal.
- Use only provided classified changes.
- Do not invent features.
- Focus on player-visible changes.`;

const STEAM_SYSTEM = `You write Steam news updates for indie game development.

Rules:
- Use a professional, official update tone.
- Structure content clearly for players.
- Use only provided classified changes.
- Do not invent content.
- Do not mention internal implementation details unless relevant to players.`;

function languageInstruction(outputLanguage: OutputLanguage): string {
  return outputLanguage === "pl" ? "Write the output in Polish." : "Write the output in English.";
}

function formatClassifiedChanges(items: ClassificationItem[]): string {
  return items
    .map(
      (item, index) =>
        `${String(index + 1)}. [${item.classification}/${item.visibility}] ${item.source}\n   Summary: ${item.suggested_public_summary}\n   Reason: ${item.reason}`,
    )
    .join("\n\n");
}

function projectDescription(project: Project): string {
  return project.description?.trim() ? project.description.trim() : "(none)";
}

export function buildClassifyPrompt(project: Project, changeInput: ChangeInput): PromptParts {
  return {
    system: CLASSIFY_SYSTEM,
    user: `Project name: ${project.name}
Project description: ${projectDescription(project)}

Changes:
${changeInput.raw_content}

Return JSON:
{
  "items": [
    {
      "source": "...",
      "classification": "bugfix | gameplay | balance | ui_ux | art_audio | content | technical | unknown",
      "visibility": "player_facing | internal | unclear",
      "reason": "...",
      "suggested_public_summary": "..."
    }
  ]
}`,
  };
}

function generateSystemForOutputType(outputType: OutputType): string {
  switch (outputType) {
    case "instagram_post":
      return SOCIAL_SYSTEM;
    case "discord_update":
      return DISCORD_SYSTEM;
    case "steam_news":
      return STEAM_SYSTEM;
    case "devlog_summary":
    case "changelog":
      return CHANGELOG_SYSTEM;
  }
}

function generateOutputFormat(outputType: OutputType): string {
  switch (outputType) {
    case "instagram_post":
      return `Output:
Caption:
Hashtags:`;
    case "devlog_summary":
      return `Output:
Title:
Body:

Note: This is a devlog-style summary derived from changelog rules.`;
    default:
      return `Output:
Title:
Body:`;
  }
}

export function buildGeneratePrompt(
  project: Project,
  outputType: OutputType,
  tone: DefaultTone,
  classifiedItems: ClassificationItem[],
  outputLanguage: OutputLanguage,
): PromptParts {
  const classifiedChanges = formatClassifiedChanges(classifiedItems);
  const inputLabel = outputType === "instagram_post" ? "Selected changes" : "Classified changes";

  return {
    system: generateSystemForOutputType(outputType),
    user: `${languageInstruction(outputLanguage)}

Input:
Project: ${project.name}
Tone: ${tone}
${inputLabel}:
${classifiedChanges}

${generateOutputFormat(outputType)}`,
  };
}
