import type { OutputLanguage } from "@/lib/ai/provider";

const POLISH_DIACRITICS = /[ąćęłńóśźż]/i;
const POLISH_HINTS =
  /\b(naprawa|poprawka|poprawiono|dodano|usunięto|zmiana|zmiany|poziom|gracz|gra|błąd|bugfix|changelog)\b/i;

export function detectOutputLanguage(rawContent: string): OutputLanguage {
  const sample = rawContent.slice(0, 500);
  if (POLISH_DIACRITICS.test(sample)) {
    return "pl";
  }
  if (POLISH_HINTS.test(sample.toLowerCase())) {
    return "pl";
  }
  return "en";
}
