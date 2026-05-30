import type { GeneratedOutput } from "@/types";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export type DraftClientApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

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

async function patchDraft(
  projectId: string,
  draftId: string,
  body: { edited_content: string | null },
): Promise<DraftClientApiResult<{ draft: GeneratedOutput }>> {
  const response = await fetch(`/api/projects/${projectId}/drafts/${draftId}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return { ok: false, status: response.status, message: errorMessage(payload, response.status) };
  }

  const draft = (payload as { draft?: GeneratedOutput }).draft;
  if (!draft) {
    return { ok: false, status: response.status, message: "Draft response was missing data" };
  }

  return { ok: true, data: { draft } };
}

export async function updateDraftBody(
  projectId: string,
  draftId: string,
  editedContent: string,
): Promise<DraftClientApiResult<{ draft: GeneratedOutput }>> {
  return patchDraft(projectId, draftId, { edited_content: editedContent });
}

export async function revertDraftToOriginal(
  projectId: string,
  draftId: string,
): Promise<DraftClientApiResult<{ draft: GeneratedOutput }>> {
  return patchDraft(projectId, draftId, { edited_content: null });
}
