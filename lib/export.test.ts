import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { buildCategoryCsv, buildExport, csvCell, csvFileName, exportFileName } from "./export";
import { statusLabels } from "./status";

type Tables = Database["public"]["Tables"];

const category = (overrides: Partial<Tables["categories"]["Row"]>): Tables["categories"]["Row"] => ({
  id: "c1",
  user_id: "secret-user",
  name: "Anime",
  slug: "anime",
  kind: "anime",
  color: "crimson",
  icon: "sparkles",
  position: 0,
  created_at: "2026-09-16T00:00:00Z",
  ...overrides,
});

const item = (overrides: Partial<Tables["items"]["Row"]>): Tables["items"]["Row"] => ({
  id: "i1",
  user_id: "secret-user",
  category_id: "c1",
  title: "One Piece",
  status: "in_progress",
  rating: 9,
  progress_current: 812,
  progress_total: null,
  notes: "Still going.",
  cover_url: null,
  backdrop_url: null,
  accent_color: null,
  genres: [],
  community_score: null,
  year: 1999,
  source: "manual",
  external_id: null,
  is_favorite: true,
  started_at: "2026-08-02",
  finished_at: null,
  created_at: "2026-09-16T00:00:00Z",
  updated_at: "2026-09-17T00:00:00Z",
  ...overrides,
});

describe("buildExport", () => {
  const profile = { username: "void_flux", display_name: "Flux", bio: null, avatar_url: null, created_at: "2026-09-16T00:00:00Z" };
  const now = new Date("2026-09-17T12:00:00Z");

  it("nests titles under their categories in sidebar order", () => {
    const result = buildExport(
      profile,
      [category({ id: "c2", name: "Games", slug: "games", position: 1 }), category({})],
      [item({}), item({ id: "i2", title: "Hades", category_id: "c2" })],
      now,
    );
    expect(result).toMatchObject({ app: "marquee", version: 1, exportedAt: now.toISOString(), profile });
    expect(result.categories.map((c) => [c.name, c.items.map((i) => i.title)])).toEqual([
      ["Anime", ["One Piece"]],
      ["Games", ["Hades"]],
    ]);
  });

  it("keeps the metadata snapshot from search", () => {
    const result = buildExport(profile, [category({})], [item({ source: "anilist", genres: ["Action"], community_score: 87 })], now);
    expect(result.categories[0].items[0]).toMatchObject({ source: "anilist", genres: ["Action"], community_score: 87 });
  });

  it("leaves out account ids", () => {
    const text = JSON.stringify(buildExport(profile, [category({})], [item({})], now));
    expect(text).not.toContain("secret-user");
    expect(text).not.toContain("category_id");
  });

  it("names the file after the user and the day", () => {
    expect(exportFileName("void_flux", now)).toBe("marquee-void_flux-2026-09-17.json");
  });
});

describe("buildCategoryCsv", () => {
  const rows = (csv: string) => csv.slice(1).trimEnd().split("\r\n");

  it("writes one row per title, status in the shelf's own words", () => {
    const csv = buildCategoryCsv(statusLabels("movie"), [
      item({ title: "Dune", status: "completed", progress_current: 0, rating: 8, is_favorite: false, year: 2021, notes: null, genres: ["Sci-Fi", "Drama"], source: "tmdb", finished_at: "2026-09-01" }),
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(rows(csv)).toEqual([
      "Title,Status,Progress,Total,Rating,Favourite,Released,Started,Finished,Genres,Community score,Source,Notes,Added,Updated",
      "Dune,Watched,,,8,,2021,2026-08-02,2026-09-01,Sci-Fi; Drama,,TMDB,,2026-09-16,2026-09-17",
    ]);
  });

  it("quotes commas, quotes and line breaks, and keeps formulas as text", () => {
    expect(csvCell('Say "hi", then go\nhome')).toBe('"Say ""hi"", then go\nhome"');
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("-1 episode left")).toBe("'-1 episode left");
    expect(csvCell(-1)).toBe("-1");
    expect(csvCell(true)).toBe("yes");
    expect(csvCell(null)).toBe("");
  });

  it("names the file after the shelf and the day", () => {
    expect(csvFileName("anime", new Date("2026-09-19T10:00:00Z"))).toBe("marquee-anime-2026-09-19.csv");
  });
});
