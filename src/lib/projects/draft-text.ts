import type { GeneratedOutput } from "@/types";

type DraftTextFields = Pick<GeneratedOutput, "title" | "content" | "edited_content">;

export function draftDisplayTitle(draft: DraftTextFields): string {
  const title = draft.title?.trim();
  if (title) {
    return title;
  }
  return "Untitled draft";
}

export function draftBody(draft: DraftTextFields): string {
  return draft.edited_content ?? draft.content;
}

export function draftSnippet(draft: DraftTextFields, maxLength = 120): string {
  const text = draftBody(draft).trim().replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
