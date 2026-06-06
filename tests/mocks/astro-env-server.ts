/** Vitest stub for `astro:env/server` — reads process.env on each use (vi.stubEnv-safe). */

function lazyEnv(key: string): string {
  const read = (): string => process.env[key] ?? "";

  return new Proxy(
    { toString: () => read() },
    {
      get(_target, prop) {
        const value = read();
        if (prop === "valueOf") return () => value;
        if (prop === "toString") return () => value;
        if (prop === Symbol.toPrimitive) return () => value;

        const method = String.prototype[prop as keyof string];
        if (typeof method === "function") {
          return (...args: unknown[]) => method.apply(value, args as []);
        }

        return value[prop as keyof string];
      },
    },
  ) as string;
}

export const SUPABASE_URL = lazyEnv("SUPABASE_URL");
export const SUPABASE_KEY = lazyEnv("SUPABASE_KEY");
export const GEMINI_API_KEY = lazyEnv("GEMINI_API_KEY");
export const GEMINI_MODEL = lazyEnv("GEMINI_MODEL");
export const AI_PROVIDER = lazyEnv("AI_PROVIDER");
