import type { ChangeInput, DefaultTone, GeneratedOutput, GenerationRun, OutputType } from "@/types";
import type { ClassificationItem } from "@/lib/ai/classification";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export interface CreateChangeInputBody {
  title?: string | null;
  raw_content: string;
}

export interface RunGenerationBody {
  change_input_id: string;
  output_type: OutputType;
  tone?: DefaultTone;
}

export interface RunGenerationOptions {
  useDevMockProvider?: boolean;
}

export type ClientApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = payload.error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return `Request failed with status ${String(status)}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export async function createChangeInput(
  projectId: string,
  body: CreateChangeInputBody,
): Promise<ClientApiResult<{ changeInput: ChangeInput }>> {
  const response = await fetch(`/api/projects/${projectId}/change-inputs`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return { ok: false, status: response.status, message: errorMessage(payload, response.status) };
  }

  const changeInput = (payload as { changeInput?: ChangeInput }).changeInput;
  if (!changeInput) {
    return { ok: false, status: response.status, message: "Change input response was missing data" };
  }

  return { ok: true, data: { changeInput } };
}

export async function runGeneration(
  projectId: string,
  body: RunGenerationBody,
  options: RunGenerationOptions = {},
): Promise<
  ClientApiResult<{
    generationRun: GenerationRun;
    generatedOutput: GeneratedOutput;
    classifiedItems: ClassificationItem[];
  }>
> {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  if (options.useDevMockProvider) {
    headers["x-dev-mock-provider"] = "1";
  }

  const response = await fetch(`/api/projects/${projectId}/generation-runs`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return { ok: false, status: response.status, message: errorMessage(payload, response.status) };
  }

  const data = payload as {
    generationRun?: GenerationRun;
    generatedOutput?: GeneratedOutput;
    classifiedItems?: ClassificationItem[];
  };

  if (!data.generationRun || !data.generatedOutput || !data.classifiedItems) {
    return { ok: false, status: response.status, message: "Generation response was missing data" };
  }

  return {
    ok: true,
    data: {
      generationRun: data.generationRun,
      generatedOutput: data.generatedOutput,
      classifiedItems: data.classifiedItems,
    },
  };
}
