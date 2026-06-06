export const GUARDRAIL_ACCEPTED = "rifle-damage-10pct";
export const GUARDRAIL_IGNORED = "internal-only-xyz";

export function buildMultiLineGuardrailInput(): {
  raw_content: string;
  accepted: string;
  ignored: string;
} {
  const accepted = GUARDRAIL_ACCEPTED;
  const ignored = GUARDRAIL_IGNORED;
  return {
    raw_content: `Balance patch: reduced ${accepted}.\nInternal note: ${ignored} — do not publish.`,
    accepted,
    ignored,
  };
}
