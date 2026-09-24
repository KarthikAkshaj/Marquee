// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TitleShape } from "@/lib/search/types";

type Row = { id: string; external_id: string | null; source: string; categories: { kind: string } };

let signedIn = true;
let rows: Row[] = [];
let readError: { message: string } | null = null;
const saved: Record<string, unknown>[][] = [];
/** The `gt` the action asked for, which is how it walks past titles it can't fill. */
let askedAfter: string | null = null;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    // A thenable chain, so `await query` after any run of filters resolves.
    const query = {
      select: () => query,
      is: () => query,
      not: () => query,
      in: () => query,
      order: () => query,
      limit: () => query,
      gt: (_column: string, value: string) => ((askedAfter = value), query),
      then: (resolve: (value: { data: Row[] | null; error: unknown }) => void) =>
        resolve({ data: readError ? null : rows, error: readError }),
    };
    return {
      auth: { getClaims: async () => ({ data: signedIn ? { claims: { sub: "user-1" } } : null }) },
      from: () => query,
      rpc: async (_name: string, args: { rows: Record<string, unknown>[] }) => {
        saved.push(args.rows);
        return { data: args.rows.length, error: null };
      },
    };
  },
}));

const shapes = vi.fn<(ids: readonly string[]) => Promise<Map<string, TitleShape>>>();
vi.mock("@/lib/search/anilist", () => ({ getAniListShapes: (ids: readonly string[]) => shapes(ids) }));

const movieDetails = vi.fn();
const seriesDetails = vi.fn();
vi.mock("@/lib/search", () => ({
  getMovieDetails: (id: string) => movieDetails(id),
  getSeriesDetails: (id: string) => seriesDetails(id),
}));

const { fillRuntimes } = await import("./backfill");

const anime = (id: string, externalId: string): Row => ({
  id,
  external_id: externalId,
  source: "anilist",
  categories: { kind: "anime" },
});

describe("fillRuntimes", () => {
  beforeEach(() => {
    signedIn = true;
    rows = [];
    readError = null;
    saved.length = 0;
    askedAfter = null;
    shapes.mockReset();
    shapes.mockResolvedValue(new Map());
    movieDetails.mockReset();
    seriesDetails.mockReset();
  });

  it("asks AniList for the whole batch at once and saves what comes back", async () => {
    rows = [anime("a", "101"), anime("b", "102")];
    shapes.mockResolvedValue(
      new Map<string, TitleShape>([
        ["101", { runtimeMinutes: 24, format: "tv" }],
        ["102", { runtimeMinutes: 107, format: "movie" }],
      ]),
    );

    const result = await fillRuntimes(null);

    expect(shapes).toHaveBeenCalledTimes(1);
    expect(shapes).toHaveBeenCalledWith(["101", "102"]);
    expect(saved[0]).toEqual([
      { id: "a", runtime_minutes: 24, format: "tv" },
      { id: "b", runtime_minutes: 107, format: "movie" },
    ]);
    expect(result).toEqual({ ok: true, done: true, filled: 2, cursor: "b" });
  });

  it("steps past a title the provider no longer knows instead of retrying it forever", async () => {
    rows = [anime("a", "101"), anime("b", "999")];
    shapes.mockResolvedValue(new Map<string, TitleShape>([["101", { runtimeMinutes: 24, format: "tv" }]]));

    const result = await fillRuntimes(null);

    expect(saved[0]).toEqual([{ id: "a", runtime_minutes: 24, format: "tv" }]);
    // The cursor is where the batch ended, not where the last save landed.
    expect(result).toMatchObject({ ok: true, filled: 1, cursor: "b" });
  });

  it("marks a film TMDB has no runtime for, so it is never asked about again", async () => {
    rows = [{ id: "a", external_id: "438631", source: "tmdb", categories: { kind: "movie" } }];
    movieDetails.mockResolvedValue(null);

    await fillRuntimes(null);

    expect(saved[0]).toEqual([{ id: "a", runtime_minutes: null, format: "movie" }]);
  });

  it("reads a film's and a show's running time from their own lookups", async () => {
    rows = [
      { id: "a", external_id: "438631", source: "tmdb", categories: { kind: "movie" } },
      { id: "b", external_id: "1396", source: "tmdb", categories: { kind: "series" } },
    ];
    movieDetails.mockResolvedValue({ runtimeMinutes: 155 });
    seriesDetails.mockResolvedValue({ runtimeMinutes: 47, progressTotal: 62 });

    await fillRuntimes(null);

    expect(saved[0]).toEqual([
      { id: "a", runtime_minutes: 155, format: "movie" },
      { id: "b", runtime_minutes: 47, format: "tv" },
    ]);
  });

  it("carries on when AniList is down rather than losing the rest of the batch", async () => {
    rows = [anime("a", "101"), { id: "b", external_id: "438631", source: "tmdb", categories: { kind: "movie" } }];
    shapes.mockRejectedValue(new Error("anilist: 503"));
    movieDetails.mockResolvedValue({ runtimeMinutes: 155 });

    const result = await fillRuntimes(null);

    expect(saved[0]).toEqual([{ id: "b", runtime_minutes: 155, format: "movie" }]);
    expect(result).toMatchObject({ ok: true, filled: 1 });
  });

  it("starts where the last batch stopped, and stops when there's nothing left", async () => {
    rows = [];
    const result = await fillRuntimes("a");

    expect(askedAfter).toBe("a");
    expect(result).toEqual({ ok: true, done: true, filled: 0, cursor: "a" });
  });

  it("saves nothing when the session has ended, or when the read fails", async () => {
    signedIn = false;
    expect(await fillRuntimes(null)).toMatchObject({ ok: false });

    signedIn = true;
    readError = { message: "boom" };
    expect(await fillRuntimes(null)).toMatchObject({ ok: false });
    expect(saved).toHaveLength(0);
  });
});
