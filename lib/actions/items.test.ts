// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AddFromSearchInput } from "@/lib/add";

let signedIn = true;
let categoryKind: string | null = "anime";
let insertError: { code: string } | null = null;
const inserted: Record<string, unknown>[] = [];
const updates: { patch: Record<string, unknown>; filters: [string, string, unknown][] }[] = [];

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: signedIn ? { claims: { sub: "user-1" } } : null }) },
    from: (table: string) => {
      if (table === "categories") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: categoryKind ? { kind: categoryKind } : null, error: null }) }),
          }),
        };
      }
      return {
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row);
          return { error: insertError };
        },
        update: (patch: Record<string, unknown>) => {
          const entry = { patch, filters: [] as [string, string, unknown][] };
          updates.push(entry);
          const chain = {
            eq: (column: string, value: unknown) => (entry.filters.push(["eq", column, value]), chain),
            is: (column: string, value: unknown) => (entry.filters.push(["is", column, value]), Promise.resolve({ error: null })),
          };
          return chain;
        },
      };
    },
  }),
}));

const getAddDetails = vi.fn();
vi.mock("@/lib/search", () => ({ getAddDetails: (kind: string, id: string) => getAddDetails(kind, id) }));

const { addFromSearch, setItemAccent } = await import("./items");

const ID = "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";
const CATEGORY = "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d";

const input = (overrides: Partial<AddFromSearchInput> = {}): AddFromSearchInput => ({
  id: ID,
  categoryId: CATEGORY,
  status: "planned",
  result: {
    source: "anilist",
    externalId: "154587",
    title: "Frieren: Beyond Journey’s End",
    year: 2023,
    progressTotal: 28,
    genres: ["Adventure", "Drama", "Fantasy"],
    communityScore: 91,
    accentColor: "#bbf1a1",
  },
  ...overrides,
});

describe("addFromSearch", () => {
  beforeEach(() => {
    signedIn = true;
    categoryKind = "anime";
    insertError = null;
    inserted.length = 0;
    getAddDetails.mockReset();
  });

  it("saves the title with its metadata snapshot under the browser's id", async () => {
    expect(await addFromSearch(input())).toEqual({ ok: true });
    expect(inserted[0]).toMatchObject({
      id: ID,
      user_id: "user-1",
      category_id: CATEGORY,
      title: "Frieren: Beyond Journey’s End",
      status: "planned",
      year: 2023,
      progress_total: 28,
      progress_current: 0,
      source: "anilist",
      external_id: "154587",
      genres: ["Adventure", "Drama", "Fantasy"],
      community_score: 91,
      accent_color: "#bbf1a1",
    });
  });

  it("looks up a series' episode total when it's added", async () => {
    categoryKind = "series";
    getAddDetails.mockResolvedValue({ progressTotal: 62, genres: ["Drama", "Crime"] });
    const breakingBad = { source: "tmdb" as const, externalId: "1396", title: "Breaking Bad", genres: ["Drama"] };
    expect(await addFromSearch(input({ result: breakingBad }))).toEqual({ ok: true });
    expect(getAddDetails).toHaveBeenCalledWith("series", "1396");
    expect(inserted[0]).toMatchObject({ progress_total: 62, genres: ["Drama", "Crime"] });
  });

  it("still adds a series when TMDB can't give details, just without a total", async () => {
    categoryKind = "series";
    getAddDetails.mockResolvedValue(null);
    await addFromSearch(input({ result: { source: "tmdb", externalId: "95396", title: "Severance", genres: ["Drama"] } }));
    expect(inserted[0]).toMatchObject({ progress_total: null, genres: ["Drama"] });
  });

  it("refuses results from the wrong provider for the shelf, and custom shelves", async () => {
    categoryKind = "game";
    expect(await addFromSearch(input())).toMatchObject({ ok: false });
    categoryKind = "custom";
    expect(await addFromSearch(input())).toMatchObject({ ok: false });
    expect(inserted).toHaveLength(0);
  });

  it("explains a duplicate, a missing shelf and an ended session", async () => {
    insertError = { code: "23505" };
    expect(await addFromSearch(input())).toEqual({ ok: false, message: "That's already on this shelf." });
    categoryKind = null;
    expect(await addFromSearch(input())).toEqual({ ok: false, message: "That shelf isn't there anymore." });
    signedIn = false;
    expect(await addFromSearch(input())).toEqual({ ok: false, message: "Your session ended. Sign in again." });
  });
});

describe("setItemAccent", () => {
  beforeEach(() => {
    signedIn = true;
  });

  it("fills in a missing colour only", async () => {
    expect(await setItemAccent(ID, "#3A5F8C")).toEqual({ ok: true });
    expect(updates.at(-1)).toEqual({
      patch: { accent_color: "#3a5f8c" },
      filters: [
        ["eq", "id", ID],
        ["is", "accent_color", null],
      ],
    });
    expect(await setItemAccent(ID, "tomato")).toMatchObject({ ok: false });
  });
});
