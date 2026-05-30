import type { GeneratedOutput } from "@/types";

export function draftDisplayTitle(draft: GeneratedOutput): string {
  const title = draft.title?.trim();
  if (title) {
    return title;
  }
  return "Untitled draft";
}

export function draftBody(draft: GeneratedOutput): string {
  return draft.edited_content ?? draft.content;
}

export function draftSnippet(draft: GeneratedOutput, maxLength = 120): string {
  const text = draftBody(draft).trim().replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
