import { z } from "zod";
import { classificationItemSchema, type ClassificationItem } from "@/lib/ai/classification";

const promptSnapshotSchema = z.object({
  v: z.literal(1).optional(),
  provider: z.string().optional(),
  model: z.string().nullable().optional(),
  classifiedItems: z.array(classificationItemSchema).optional(),
  outputLanguage: z.enum(["pl", "en"]).optional(),
});

export interface ParsedPromptSnapshot {
  classifiedItems: ClassificationItem[];
  outputLanguage?: "pl" | "en";
  provider?: string;
}

export function parsePromptSnapshot(raw: string | null | undefined): ParsedPromptSnapshot | null {
  if (!raw) {
    return null;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const parsed = promptSnapshotSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }

  return {
    classifiedItems: parsed.data.classifiedItems ?? [],
    outputLanguage: parsed.data.outputLanguage,
    provider: parsed.data.provider,
  };
}
