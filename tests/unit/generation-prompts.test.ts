import { describe, expect, it } from "vitest";
import { buildClassifyPrompt, buildGeneratePrompt } from "@/lib/ai/prompts";
import { buildMultiLineGuardrailInput } from "../helpers/guardrail-fixtures";
import type { ChangeInput, Project } from "@/types";

function sampleProject(): Project {
  return {
    id: crypto.randomUUID(),
    owner_id: crypto.randomUUID(),
    name: "Prompt Boundary Game",
    description: "A test project",
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

describe("generation prompt boundaries", () => {
  it("embeds full raw_content in classify user prompt", () => {
    const { raw_content, accepted, ignored } = buildMultiLineGuardrailInput();
    const project = sampleProject();
    const changeInput = sampleChangeInput(project.id, raw_content);

    const { user } = buildClassifyPrompt(project, changeInput);

    expect(user).toContain(raw_content);
    expect(user).toContain(accepted);
    expect(user).toContain(ignored);
  });

  it("uses classified items in generate prompt without raw_content-only tokens", () => {
    const { raw_content, accepted, ignored } = buildMultiLineGuardrailInput();
    const project = sampleProject();
    const firstLine = raw_content.split("\n")[0] ?? raw_content;

    const { user } = buildGeneratePrompt(
      project,
      "changelog",
      "professional",
      [
        {
          source: firstLine,
          classification: "balance",
          visibility: "player_facing",
          reason: "Player-visible balance tweak",
          suggested_public_summary: firstLine,
        },
      ],
      "en",
    );

    expect(user).toContain(accepted);
    expect(user).not.toContain(ignored);
    expect(user).not.toContain(raw_content);
  });
});
