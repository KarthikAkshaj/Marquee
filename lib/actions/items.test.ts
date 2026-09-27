// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AddFromSearchInput } from "@/lib/add";

let signedIn = true;
let categoryKind: string | null = "anime";
let insertError: { code: string } | null = null;
const inserted: Record<string, unknown>[] = [];
/** Provider ids already on the shelf, for the check before adding a run. */
let onShelf: string[] = [];
const deleted: string[][] = [];
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
        select: () => {
          const chain = {
            eq: () => chain,
            in: async (_column: string, ids: string[]) => ({
              data: ids.filter((id) => onShelf.includes(id)).map((id) => ({ external_id: id })),
              error: null,
            }),
          };
          return chain;
        },
        insert: async (row: Record<string, unknown> | Record<string, unknown>[]) => {
          inserted.push(...(Array.isArray(row) ? row : [row]));
          return { error: insertError };
        },
        delete: () => ({
          in: async (_column: string, ids: string[]) => {
            deleted.push(ids);
            return { error: null };
          },
        }),
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

const { addFromSearch, addManyFromSearch, deleteItems, setItemAccent } = await import("./items");

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

describe("addManyFromSearch", () => {
  const film = (externalId: string, title: string) => ({ source: "tmdb" as const, externalId, title, format: "movie" as const });
  const PART_TWO = "5c1e8f0a-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
  const PART_THREE = "6d2f9a1b-3c4e-4f6a-9b0c-1d2e3f4a5b6c";
  const run = (entries = [
    { id: PART_TWO, status: "completed" as const, result: film("693134", "Dune: Part Two") },
    { id: PART_THREE, status: "planned" as const, result: film("1170608", "Dune: Part Three") },
  ]) => ({ categoryId: CATEGORY, entries });

  beforeEach(() => {
    signedIn = true;
    categoryKind = "movie";
    insertError = null;
    inserted.length = 0;
    onShelf = [];
    getAddDetails.mockReset();
  });

  it("adds a run in one go, each with its own running time, the first one newest", async () => {
    getAddDetails.mockImplementation(async (_kind: string, id: string) => ({ runtimeMinutes: id === "693134" ? 167 : undefined }));
    expect(await addManyFromSearch(run())).toEqual({ ok: true, added: [PART_TWO, PART_THREE] });
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ id: PART_TWO, user_id: "user-1", status: "completed", external_id: "693134", runtime_minutes: 167, format: "movie" });
    expect(inserted[1]).toMatchObject({ id: PART_THREE, status: "planned", runtime_minutes: null });
    expect(String(inserted[0].created_at) > String(inserted[1].created_at)).toBe(true);
    expect(inserted[0].updated_at).toBe(inserted[0].created_at);
  });

  it("leaves out what's already on the shelf instead of failing the lot", async () => {
    onShelf = ["693134"];
    expect(await addManyFromSearch(run())).toEqual({ ok: true, added: [PART_THREE] });
    expect(inserted.map((row) => row.external_id)).toEqual(["1170608"]);

    inserted.length = 0;
    onShelf = ["693134", "1170608"];
    expect(await addManyFromSearch(run())).toEqual({ ok: true, added: [] });
    expect(inserted).toHaveLength(0);
  });

  it("refuses results from another provider, the same id twice, a missing shelf and an ended session", async () => {
    expect(await addManyFromSearch(run([{ id: PART_TWO, status: "planned", result: { ...film("1", "Frieren"), source: "anilist" as never } }]))).toMatchObject({ ok: false });
    expect(await addManyFromSearch(run([
      { id: PART_TWO, status: "planned", result: film("693134", "Dune: Part Two") },
      { id: PART_TWO, status: "planned", result: film("1170608", "Dune: Part Three") },
    ]))).toMatchObject({ ok: false });
    expect(inserted).toHaveLength(0);

    insertError = { code: "23505" };
    expect(await addManyFromSearch(run())).toEqual({ ok: false, message: "Some of those are already on this shelf." });
    categoryKind = null;
    expect(await addManyFromSearch(run())).toEqual({ ok: false, message: "That shelf isn't there anymore." });
    signedIn = false;
    expect(await addManyFromSearch(run())).toEqual({ ok: false, message: "Your session ended. Sign in again." });
  });
});

describe("deleteItems", () => {
  beforeEach(() => {
    signedIn = true;
    deleted.length = 0;
  });

  it("takes back titles added together, and nothing that isn't an id", async () => {
    expect(await deleteItems([ID, CATEGORY])).toEqual({ ok: true });
    expect(deleted).toEqual([[ID, CATEGORY]]);
    expect(await deleteItems([])).toMatchObject({ ok: false });
    expect(await deleteItems(["not-an-id"])).toMatchObject({ ok: false });
    expect(deleted).toHaveLength(1);
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
