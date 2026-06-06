import type { AstroCookies } from "astro";

/** Minimal Astro cookie jar for handler and middleware tests. */
export function createMockCookies(initial?: Record<string, string>): AstroCookies {
  const store = new Map(Object.entries(initial ?? {}));

  return {
    get(name: string) {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string) {
      store.set(name, value);
    },
    delete(name: string) {
      store.delete(name);
    },
    has(name: string) {
      return store.has(name);
    },
    headers() {
      return Array.from(store.entries()).map(([name, value]) => `${name}=${value}`);
    },
  } as unknown as AstroCookies;
}

export function cookieHeaderFromStore(store: Map<string, string>): string {
  return Array.from(store.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
