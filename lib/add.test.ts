import { describe, expect, it } from "vitest";
import { findDuplicate, itemFromResult, newItemId, resultMeta, searchKindOf, searchNotice } from "./add";
import type { SearchResult } from "./search/types";

const frieren: SearchResult = {
  source: "anilist",
  externalId: "154587",
  title: "Frieren: Beyond Journey’s End",
  year: 2023,
  coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587.jpg",
  progressTotal: 28,
  subtitle: "TV · 28 eps",
  genres: ["Adventure", "Drama", "Fantasy"],
  communityScore: 91,
  accentColor: "#bbf1a1",
};

const shelved = (overrides: { id: string; title: string; source?: "manual" | "anilist"; external_id?: string | null }) => ({
  status: "completed" as const,
  source: "manual" as const,
  external_id: null,
  ...overrides,
});

describe("add helpers", () => {
  it("has no provider for custom shelves", () => {
    expect(searchKindOf("custom")).toBeNull();
    expect(searchKindOf("series")).toBe("series");
  });

  it("writes the palette meta line from what's known", () => {
    expect(resultMeta(frieren)).toBe("2023 · TV · 28 eps");
    expect(resultMeta({ year: 2021 })).toBe("2021");
    expect(resultMeta({})).toBe("");
  });

  it("spots the same search result, or the same title typed by hand", () => {
    const byId = shelved({ id: "1", title: "Sousou no Frieren", source: "anilist", external_id: "154587" });
    const byTitle = shelved({ id: "2", title: "  frieren: beyond journey’s   end " });
    expect(findDuplicate(frieren, [byTitle, byId])?.id).toBe("1");
    expect(findDuplicate(frieren, [byTitle])?.id).toBe("2");
    expect(findDuplicate(frieren, [shelved({ id: "3", title: "Frieren" })])).toBeNull();
  });

  it("builds the row the add will save, stamped like the database", () => {
    const now = new Date("2026-09-17T10:00:00Z");
    const input = { id: "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11", categoryId: "c1", result: frieren };

    expect(itemFromResult({ ...input, status: "planned" }, now)).toMatchObject({
      title: frieren.title,
      year: 2023,
      progress_total: 28,
      progress_current: 0,
      genres: ["Adventure", "Drama", "Fantasy"],
      community_score: 91,
      accent_color: "#bbf1a1",
      source: "anilist",
      external_id: "154587",
      started_at: null,
    });
    expect(itemFromResult({ ...input, status: "in_progress" }, now).started_at).toBe("2026-09-17");
    expect(itemFromResult({ ...input, status: "completed" }, now)).toMatchObject({
      progress_current: 28,
      finished_at: "2026-09-17",
    });
    const bare = itemFromResult({ ...input, status: "planned", result: { source: "igdb", externalId: "1", title: "Hades" } }, now);
    expect(bare).toMatchObject({ cover_url: null, genres: [], community_score: null, progress_total: null });
  });

  it("makes v4 ids even without randomUUID", () => {
    const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(newItemId()).toMatch(v4);
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(newItemId()).toMatch(v4);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });

  it("explains an empty result list", () => {
    const base = { source: "anilist" as const, query: "frieren", idle: false, loading: false, resultCount: 0, error: undefined };
    expect(searchNotice({ ...base, query: "", idle: true })).toBe("Type a title and we'll look it up on AniList.");
    expect(searchNotice({ ...base, query: "f", idle: true })).toBeNull();
    expect(searchNotice(base)).toBe("Nothing on AniList by that name.");
    expect(searchNotice({ ...base, loading: true })).toBeNull();
    expect(searchNotice({ ...base, resultCount: 3 })).toBeNull();
    expect(searchNotice({ ...base, source: "igdb", error: "not_configured" })).toBe("IGDB search isn't set up yet, so add it by hand.");
    expect(searchNotice({ ...base, source: "tmdb", error: "unavailable" })).toMatch(/^TMDB isn't answering/);
  });
});
