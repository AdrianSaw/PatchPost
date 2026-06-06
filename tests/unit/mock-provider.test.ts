import { describe, expect, it } from "vitest";
import { mockProvider } from "@/lib/ai/mock-provider";
import { buildMultiLineGuardrailInput } from "../helpers/guardrail-fixtures";
import type { ChangeInput, Project } from "@/types";

function sampleProject(): Project {
  return {
    id: crypto.randomUUID(),
    owner_id: crypto.randomUUID(),
    name: "Guardrail Test Game",
    description: null,
    repo_url: null,
    default_tone: "professional",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function sampleChangeInput(projectId: string, raw_content: string): ChangeInput {
  return {
    id: crypto.randomUUID(),
    project_id: projectId,
    source_type: "manual",
    title: null,
    raw_content,
    created_by: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
}

describe("mockProvider guardrails", () => {
  it("classifies only the first non-empty line from multi-line input", async () => {
    const { raw_content, accepted, ignored } = buildMultiLineGuardrailInput();
    const project = sampleProject();
    const changeInput = sampleChangeInput(project.id, raw_content);

    const result = await mockProvider.classify({ project, changeInput });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.source).toContain(accepted);
    expect(result.items[0]?.source).not.toContain(ignored);
    expect(result.items[0]?.suggested_public_summary).toBe(result.items[0]?.source);
  });

  it("generates changelog content that echoes classified summaries and excludes ignored tokens", async () => {
    const { raw_content, accepted, ignored } = buildMultiLineGuardrailInput();
    const project = sampleProject();
    const changeInput = sampleChangeInput(project.id, raw_content);
    const classified = await mockProvider.classify({ project, changeInput });

    const generated = await mockProvider.generate({
      project,
      outputType: "changelog",
      tone: "professional",
      classifiedItems: classified.items,
      outputLanguage: "en",
    });

    expect(generated.title).toContain(project.name);
    expect(generated.content).toContain(accepted);
    expect(generated.content).not.toContain(ignored);
    expect(generated.hashtags).toBeNull();
  });
});
