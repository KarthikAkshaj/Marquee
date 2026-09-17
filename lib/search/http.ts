import type { z } from "zod";
import { ProviderError, type SearchSource } from "./types";

const TIMEOUT_MS = 6000;

/**
 * Fetch JSON from a provider and check its shape. Anything unexpected becomes
 * a ProviderError so callers only have one failure to handle.
 */
export async function fetchJson<T extends z.ZodType>(
  provider: SearchSource,
  url: string,
  init: RequestInit,
  schema: T,
): Promise<z.infer<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
      // unstable_cache in lib/search/index.ts is the cache; don't double-store.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "network error";
    throw new ProviderError(provider, reason);
  }

  if (!response.ok) throw new ProviderError(provider, `HTTP ${response.status}`, response.status);

  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) throw new ProviderError(provider, "unexpected response shape");
  return parsed.data;
}

/** "2023-09-29" → 2023. Blank or malformed dates → undefined. */
export function yearFromDate(date: string | null | undefined): number | undefined {
  const match = date?.match(/^(\d{4})-/);
  return match ? Number(match[1]) : undefined;
}

/** Clamp to a whole 0–100 score, or undefined when there's nothing to show. */
export function toScore(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Dedupe, drop blanks, cap the list so one odd title can't bloat a row. */
export function cleanGenres(names: readonly (string | null | undefined)[]): string[] | undefined {
  const unique = [...new Set(names.map((name) => name?.trim()).filter((name): name is string => Boolean(name)))];
  return unique.length ? unique.slice(0, 6) : undefined;
}
