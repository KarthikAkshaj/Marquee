// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveMatchesInput } from "@/lib/validators";

let kind = "anime";
let rows: { id: string; title: string; status: string; progress_current: number; progress_total: number | null }[] = [];
const updates: { id: string; patch: Record<string, unknown> }[] = [];
const conflictIds = new Set<string>();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const getSeriesDetails = vi.fn();
vi.mock("@/lib/search", () => ({ getSeriesDetails: (id: string) => getSeriesDetails(id) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "user-1" } } }) },
    from: (table: string) => {
      if (table === "categories") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { kind } }) }) }) };
      }
      return {
        select: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ data: rows, error: null }) }) }) }),
        update: (patch: Record<string, unknown>) => ({
          eq: (_column: string, id: string) => ({
            eq: async () => {
              if (conflictIds.has(id)) return { error: { code: "23505" } };
              updates.push({ id, patch });
              return { error: null };
            },
          }),
        }),
      };
    },
  }),
}));

const { saveMatches } = await import("./match");

const CATEGORY = "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const naruto = { source: "anilist" as const, externalId: "20", title: "Naruto", year: 2002, progressTotal: 220, genres: ["Action"], communityScore: 79 };

const input = (overrides: Partial<SaveMatchesInput> = {}): SaveMatchesInput => ({
  categoryId: CATEGORY,
  keepTitles: false,
  matches: [{ itemId: id(1), result: naruto }],
  ...overrides,
});

describe("saveMatches", () => {
  beforeEach(() => {
    kind = "anime";
    rows = [{ id: id(1), title: "naruto", status: "planned", progress_current: 0, progress_total: null }];
    updates.length = 0;
    conflictIds.clear();
    getSeriesDetails.mockReset();
  });

  it("turns a hand-added title into the match, with its details", async () => {
    expect(await saveMatches(input())).toEqual({ ok: true, saved: [id(1)], taken: [], failed: [] });
    expect(updates[0].patch).toMatchObject({
      title: "Naruto",
      year: 2002,
      source: "anilist",
      external_id: "20",
      genres: ["Action"],
      community_score: 79,
      progress_total: 220,
    });
    expect(updates[0].patch).not.toHaveProperty("progress_current");
  });

  it("can keep your own title", async () => {
    await saveMatches(input({ keepTitles: true }));
    expect(updates[0].patch.title).toBe("naruto");
  });

  it("fills a finished title to the total, and never sets a total below your progress or over your own", async () => {
    rows = [
      { id: id(1), title: "a", status: "completed", progress_current: 0, progress_total: null },
      { id: id(2), title: "b", status: "in_progress", progress_current: 300, progress_total: null },
      { id: id(3), title: "c", status: "in_progress", progress_current: 5, progress_total: 12 },
    ];
    await saveMatches(
      input({
        matches: [
          { itemId: id(1), result: naruto },
          { itemId: id(2), result: { ...naruto, externalId: "21" } },
          { itemId: id(3), result: { ...naruto, externalId: "22" } },
        ],
      }),
    );
    expect(updates[0].patch).toMatchObject({ progress_total: 220, progress_current: 220 });
    expect(updates[1].patch).not.toHaveProperty("progress_total");
    expect(updates[2].patch).not.toHaveProperty("progress_total");
  });

  it("looks a series' episode count up, and reports titles already taken on the shelf", async () => {
    kind = "series";
    getSeriesDetails.mockResolvedValue({ progressTotal: 62, genres: ["Drama", "Crime"] });
    rows = [
      { id: id(1), title: "breaking bad", status: "planned", progress_current: 0, progress_total: null },
      { id: id(2), title: "breaking bad again", status: "planned", progress_current: 0, progress_total: null },
    ];
    conflictIds.add(id(2));
    const bb = { source: "tmdb" as const, externalId: "1396", title: "Breaking Bad" };
    const result = await saveMatches(input({ matches: [{ itemId: id(1), result: bb }, { itemId: id(2), result: bb }] }));
    expect(result).toEqual({ ok: true, saved: [id(1)], taken: [id(2)], failed: [] });
    expect(updates[0].patch).toMatchObject({ progress_total: 62, genres: ["Drama", "Crime"] });
  });

  it("refuses matches from the wrong service for the shelf", async () => {
    kind = "game";
    expect(await saveMatches(input())).toEqual({ ok: false, message: "Those matches don't fit this shelf." });
    expect(updates).toHaveLength(0);
  });
});
