import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { buildExport, exportFileName } from "./export";

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

  it("leaves out account ids", () => {
    const text = JSON.stringify(buildExport(profile, [category({})], [item({})], now));
    expect(text).not.toContain("secret-user");
    expect(text).not.toContain("category_id");
  });

  it("names the file after the user and the day", () => {
    expect(exportFileName("void_flux", now)).toBe("marquee-void_flux-2026-09-17.json");
  });
});
