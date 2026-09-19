// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveMatchesInput } from "@/lib/validators";

type Row = Record<string, unknown> & { id: string };

// A tiny stand-in for the two tables, enough for the queries saveMatches makes.
const db: { categories: Row[]; items: Row[] } = { categories: [], items: [] };
const failing = new Set<string>();
const rpc = vi.fn();
let clock = 1000;

function query(table: keyof typeof db) {
  const filters: ((row: Row) => boolean)[] = [];
  let mode: "select" | "update" | "delete" = "select";
  let patch: Record<string, unknown> = {};
  let sort: { column: string; ascending: boolean } | null = null;
  let limit = Infinity;
  const run = () => {
    const rows = db[table].filter((row) => filters.every((keep) => keep(row)));
    if (mode === "update") {
      const clash = rows.find((row) => failing.has(row.id) || failing.has(String(row.title)));
      if (clash) return { data: null, error: { code: failing.has(clash.id) ? "23505" : "XX000" } };
      rows.forEach((row) => Object.assign(row, patch));
      return { data: null, error: null };
    }
    if (mode === "delete") {
      db[table] = db[table].filter((row) => !rows.includes(row));
      return { data: null, error: null };
    }
    const sorted = sort ? [...rows].sort((a, b) => (Number(a[sort!.column]) - Number(b[sort!.column])) * (sort!.ascending ? 1 : -1)) : rows;
    return { data: sorted.slice(0, limit), error: null };
  };
  const builder = {
    select: () => builder,
    update: (values: Record<string, unknown>) => ((mode = "update"), (patch = values), builder),
    delete: () => ((mode = "delete"), builder),
    eq: (column: string, value: unknown) => (filters.push((row) => row[column] === value), builder),
    in: (column: string, values: unknown[]) => (filters.push((row) => values.includes(row[column])), builder),
    order: (column: string, options?: { ascending?: boolean }) => ((sort = { column, ascending: options?.ascending ?? true }), builder),
    limit: (count: number) => ((limit = count), builder),
    maybeSingle: async () => ({ data: run().data?.[0] ?? null, error: null }),
    then: (resolve: (value: ReturnType<typeof run>) => unknown) => resolve(run()),
  };
  return builder;
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const getSeriesDetails = vi.fn();
vi.mock("@/lib/search", () => ({ getSeriesDetails: (id: string) => getSeriesDetails(id) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "user-1" } } }) },
    from: (table: keyof typeof db) => query(table),
    rpc: async (name: string, args: { target_category: string; titles: { title: string; status: string; year: number | null; position: number }[] }) => {
      rpc(name, args);
      for (const title of args.titles) {
        db.items.push({
          id: `new-${title.position}-${clock}`,
          category_id: args.target_category,
          source: "manual",
          external_id: null,
          title: title.title,
          status: title.status,
          year: title.year,
          progress_current: 0,
          progress_total: null,
          created_at: clock - title.position,
        });
      }
      clock += 1000;
      return { data: args.titles.length, error: null };
    },
  }),
}));

const { saveMatches } = await import("./match");

const CATEGORY = "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const naruto = { source: "anilist" as const, externalId: "20", title: "Naruto", year: 2002, progressTotal: 220, genres: ["Action"], communityScore: 79 };

function item(n: number, values: Partial<Row> = {}): Row {
  return { id: id(n), category_id: CATEGORY, source: "manual", external_id: null, title: `title ${n}`, status: "planned", progress_current: 0, progress_total: null, created_at: n, ...values };
}
const byId = (n: number) => db.items.find((row) => row.id === id(n))!;

const input = (overrides: Partial<SaveMatchesInput> = {}): SaveMatchesInput => ({
  categoryId: CATEGORY,
  keepTitles: false,
  matches: [{ itemId: id(1), result: naruto }],
  ...overrides,
});

describe("saveMatches", () => {
  beforeEach(() => {
    db.categories = [{ id: CATEGORY, kind: "anime" }];
    db.items = [item(1, { title: "naruto" })];
    failing.clear();
    rpc.mockReset();
    getSeriesDetails.mockReset();
  });

  it("turns a hand-added title into the match, with its details", async () => {
    expect(await saveMatches(input())).toEqual({ ok: true, saved: [id(1)], taken: [], failed: [], added: 0, missed: 0 });
    expect(byId(1)).toMatchObject({
      title: "Naruto",
      year: 2002,
      source: "anilist",
      external_id: "20",
      genres: ["Action"],
      community_score: 79,
      progress_total: 220,
      progress_current: 0,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("can keep your own title", async () => {
    await saveMatches(input({ keepTitles: true }));
    expect(byId(1).title).toBe("naruto");
  });

  it("fills a finished title to the total, and never sets a total below your progress or over your own", async () => {
    db.items = [item(1, { status: "completed" }), item(2, { status: "in_progress", progress_current: 300 }), item(3, { status: "in_progress", progress_current: 5, progress_total: 12 })];
    await saveMatches(
      input({
        matches: [
          { itemId: id(1), result: naruto },
          { itemId: id(2), result: { ...naruto, externalId: "21" } },
          { itemId: id(3), result: { ...naruto, externalId: "22" } },
        ],
      }),
    );
    expect(byId(1)).toMatchObject({ progress_total: 220, progress_current: 220 });
    expect(byId(2)).toMatchObject({ progress_total: null, progress_current: 300 });
    expect(byId(3)).toMatchObject({ progress_total: 12, progress_current: 5 });
  });

  it("looks a series' episode count up, and reports titles already taken on the shelf", async () => {
    db.categories = [{ id: CATEGORY, kind: "series" }];
    db.items = [item(1), item(2)];
    getSeriesDetails.mockResolvedValue({ progressTotal: 62, genres: ["Drama", "Crime"] });
    failing.add(id(2));
    const bb = { source: "tmdb" as const, externalId: "1396", title: "Breaking Bad" };
    const result = await saveMatches(input({ matches: [{ itemId: id(1), result: bb }, { itemId: id(2), result: bb }] }));
    expect(result).toMatchObject({ ok: true, saved: [id(1)], taken: [id(2)], failed: [] });
    expect(byId(1)).toMatchObject({ progress_total: 62, genres: ["Drama", "Crime"] });
  });

  it("refuses matches from the wrong service for the shelf", async () => {
    db.categories = [{ id: CATEGORY, kind: "game" }];
    expect(await saveMatches(input())).toEqual({ ok: false, message: "Those matches don't fit this shelf." });
    expect(byId(1).source).toBe("manual");
  });

  it("adds the other seasons picked, with no made-up dates, skipping ones already on the shelf", async () => {
    db.items = [item(1, { title: "jjk", status: "completed" }), item(2, { source: "anilist", external_id: "131573", title: "Jujutsu Kaisen 0" })];
    const season = (externalId: string, title: string, progressTotal?: number) => ({ source: "anilist" as const, externalId, title, year: 2023, progressTotal, coverUrl: "https://s4.anilist.co/cover.jpg" });
    const result = await saveMatches(
      input({
        matches: [
          {
            itemId: id(1),
            result: season("113415", "Jujutsu Kaisen", 24),
            extras: [
              { result: season("145064", "Jujutsu Kaisen Season 2", 23), status: "completed" },
              { result: season("131573", "Jujutsu Kaisen 0", 1), status: "completed" },
              { result: season("172463", "Culling Game"), status: "in_progress" },
            ],
          },
        ],
      }),
    );

    expect(result).toEqual({ ok: true, saved: [id(1)], taken: [], failed: [], added: 2, missed: 0 });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [, args] = rpc.mock.calls[0];
    expect(args.batch_started).toBe("9999-12-31T00:00:00.000Z");
    expect(args.titles).toEqual([
      { title: "Jujutsu Kaisen Season 2", status: "completed", year: 2023, position: 0 },
      { title: "Culling Game", status: "in_progress", year: 2023, position: 1 },
    ]);
    const added = db.items.filter((row) => String(row.id).startsWith("new-"));
    expect(added.map((row) => [row.title, row.source, row.external_id, row.status, row.progress_current, row.progress_total])).toEqual([
      ["Jujutsu Kaisen Season 2", "anilist", "145064", "completed", 23, 23],
      ["Culling Game", "anilist", "172463", "in_progress", 0, null],
    ]);
    expect(db.items.filter((row) => row.external_id === "131573")).toHaveLength(1);
  });

  it("removes a season it couldn't fill in, and leaves seasons of a failed match alone", async () => {
    db.items = [item(1), item(2)];
    failing.add("Broken season").add(id(2));
    const extra = (externalId: string, title: string) => ({ result: { source: "anilist" as const, externalId, title }, status: "planned" as const });
    const result = await saveMatches(
      input({
        matches: [
          { itemId: id(1), result: naruto, extras: [extra("1735", "Shippuden"), extra("999", "Broken season")] },
          { itemId: id(2), result: { ...naruto, externalId: "21" }, extras: [extra("555", "Never added")] },
        ],
      }),
    );
    expect(result).toEqual({ ok: true, saved: [id(1)], taken: [id(2)], failed: [], added: 1, missed: 1 });
    expect(db.items.map((row) => row.title)).toEqual(["Naruto", "title 2", "Shippuden"]);
  });
});
