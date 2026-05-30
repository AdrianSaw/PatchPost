import { z } from "zod";

const JSON_CONTENT_TYPE = "application/json";

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": JSON_CONTENT_TYPE },
  });
}

export function jsonError(status: number, message: string): Response {
  return jsonResponse(status, { error: message });
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { error: Response }> {
  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    return { error: jsonError(422, "Invalid JSON body") };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: jsonError(422, parsed.error.issues.map((issue) => issue.message).join("; ")) };
  }

  return { data: parsed.data };
}

export function parseUuidParam(value: string | undefined): string | null {
  return z.uuid().safeParse(value).success ? (value ?? null) : null;
}
