import type { DefaultTone, OutputType } from "@/types";
import { defaultToneSchema, outputTypeSchema } from "@/types";

export const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  changelog: "Changelog / patch notes",
  instagram_post: "Social post (Instagram)",
  discord_update: "Team update (Discord)",
  steam_news: "Steam news",
  devlog_summary: "Devlog summary",
};

export const TONE_LABELS: Record<DefaultTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  hype: "Hype",
  indie_devlog: "Indie devlog",
  technical: "Technical",
};

export function formatOutputType(outputType: OutputType | null | undefined): string {
  if (!outputType) {
    return "Unknown channel";
  }
  return OUTPUT_TYPE_LABELS[outputType];
}

export function formatTone(tone: DefaultTone | null | undefined): string {
  if (!tone) {
    return "";
  }
  return TONE_LABELS[tone];
}

export const OUTPUT_TYPE_OPTIONS = outputTypeSchema.options.map((value) => ({
  value,
  label: OUTPUT_TYPE_LABELS[value],
}));

export const TONE_OPTIONS = defaultToneSchema.options.map((value) => ({
  value,
  label: TONE_LABELS[value],
}));
