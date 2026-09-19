// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const db: Record<"profiles" | "categories" | "items", Row[]> = { profiles: [], categories: [], items: [] };
const ranges: [number, number][] = [];
let signedIn = true;

function query(table: keyof typeof db) {
  const filters: ((row: Row) => boolean)[] = [];
  let window: [number, number] | null = null;
  const rows = () => {
    const kept = db[table].filter((row) => filters.every((keep) => keep(row)));
    return window ? kept.slice(window[0], window[1] + 1) : kept;
  };
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => (filters.push((row) => row[column] === value), builder),
    order: () => builder,
    range: (from: number, to: number) => ((window = [from, to]), ranges.push(window), builder),
    single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: "none" } }),
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data: rows(), error: null }),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: signedIn ? { claims: { sub: "user-1" } } : null }) },
    from: (table: keyof typeof db) => query(table),
  }),
}));

const { exportCategoryCsv, exportData } = await import("./data");

const ANIME = "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d";
const GAMES = "1b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d";
const item = (n: number, categoryId: string) => ({
  id: `item-${n}`,
  user_id: "user-1",
  category_id: categoryId,
  title: `Title ${n}`,
  status: "completed",
  rating: null,
  progress_current: 0,
  progress_total: null,
  notes: null,
  is_favorite: false,
  year: null,
  started_at: null,
  finished_at: null,
  cover_url: null,
  backdrop_url: null,
  accent_color: null,
  genres: [],
  community_score: null,
  source: "manual",
  external_id: null,
  created_at: "2026-09-19T00:00:00Z",
  updated_at: "2026-09-19T00:00:00Z",
});

describe("data exports", () => {
  beforeEach(() => {
    signedIn = true;
    ranges.length = 0;
    db.profiles = [{ id: "user-1", username: "void_flux", display_name: "Flux", bio: null, avatar_url: null, created_at: "2026-09-16T00:00:00Z" }];
    db.categories = [
      { id: ANIME, user_id: "user-1", name: "Anime", slug: "anime", kind: "anime", color: "crimson", icon: "sparkles", position: 0, created_at: "2026-09-16T00:00:00Z" },
      { id: GAMES, user_id: "user-1", name: "Games", slug: "games", kind: "game", color: "teal", icon: "gamepad-2", position: 1, created_at: "2026-09-16T00:00:00Z" },
    ];
    db.items = [...Array.from({ length: 2300 }, (_, n) => item(n, ANIME)), item(9000, GAMES)];
  });

  it("exports every title, however many pages it takes", async () => {
    const result = await exportData();
    if (!result.ok) throw new Error(result.message);
    expect(result.data.categories.map((category) => category.items.length)).toEqual([2300, 1]);
    expect(result.fileName).toMatch(/^marquee-void_flux-\d{4}-\d{2}-\d{2}\.json$/);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("exports one shelf as CSV in its own words", async () => {
    const result = await exportCategoryCsv(GAMES);
    if (!result.ok) throw new Error(result.message);
    expect(result.csv.split("\r\n")[1]).toBe("Title 9000,Finished,,,,,,,,,,Added by hand,,2026-09-19,2026-09-19");
    expect(result.fileName).toMatch(/^marquee-games-/);
  });

  it("refuses shelves that aren't yours and signed-out visitors", async () => {
    expect(await exportCategoryCsv("not-a-uuid")).toEqual({ ok: false, message: "Pick one of your categories." });
    expect(await exportCategoryCsv("2b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d")).toEqual({ ok: false, message: "Pick one of your categories." });
    signedIn = false;
    expect(await exportData()).toEqual({ ok: false, message: "Your session ended. Sign in again." });
  });
});
