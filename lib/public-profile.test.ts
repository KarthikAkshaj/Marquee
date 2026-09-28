import { describe, expect, it } from "vitest";
import { publicHref, publicPageSchema, publicProfileSchema, publicStats, publicTitleSchema } from "./public-profile";

const profile = publicProfileSchema.parse({
  username: "akshaj",
  display_name: "Akshaj",
  avatar_url: null,
  bio: "Anime at midnight.",
  member_since: "2026-03",
  shelves: [
    { slug: "anime", name: "Anime", kind: "anime", color: "violet", icon: "sparkles", count: 120 },
    { slug: "movies", name: "Movies", kind: "movie", color: "amber", icon: "clapperboard", count: 42 },
  ],
  finished_this_year: 17,
});

describe("publicProfileSchema", () => {
  it("falls back to a known colour and icon rather than failing the page", () => {
    const odd = publicProfileSchema.parse({
      ...profile,
      shelves: [{ slug: "x", name: "X", kind: "custom", color: "#ff0000", icon: "skull", count: 1 }],
    });
    expect(odd.shelves[0]).toMatchObject({ color: "amber", icon: "clapperboard" });
  });

  it("refuses a shelf of an unknown kind", () => {
    expect(() => publicProfileSchema.parse({ ...profile, shelves: [{ ...profile.shelves[0], kind: "podcast" }] })).toThrow();
  });
});

describe("publicTitleSchema", () => {
  const title = {
    id: "t1",
    title: "Frieren",
    status: "completed",
    rating: 10,
    progress_current: 28,
    progress_total: 28,
    cover_url: null,
    backdrop_url: null,
    accent_color: null,
    year: 2023,
    format: "tv",
    genres: ["Fantasy"],
    is_favorite: true,
  };

  it("reads what the function sends", () => {
    expect(publicTitleSchema.parse(title).title).toBe("Frieren");
  });

  it("drops anything it wasn't built to show", () => {
    const parsed = publicTitleSchema.parse({ ...title, notes: "cried twice", started_at: "2026-01-02" });
    expect(parsed).not.toHaveProperty("notes");
    expect(parsed).not.toHaveProperty("started_at");
  });
});

describe("publicStats", () => {
  it("counts the shared shelves only, in the member pass's shape", () => {
    expect(publicStats(profile)).toEqual({ memberSince: "2026-03", totalTitles: 162, completedThisYear: 17 });
  });
});

describe("publicPageSchema", () => {
  it("reads the page in one piece, and never takes a missing owner flag as yes", () => {
    const page = publicPageSchema.parse({ ...profile, own: null, shelf: "anime", titles: [] });
    expect(page).toMatchObject({ own: false, shelf: "anime", titles: [] });
    expect(page.shelves).toHaveLength(2);
  });
});

describe("publicHref", () => {
  it("leaves the first shelf and All out so links stay short", () => {
    expect(publicHref("akshaj", "anime", { shelf: "anime", status: "all" })).toBe("/u/akshaj");
    expect(publicHref("akshaj", "anime", { shelf: "movies" })).toBe("/u/akshaj?shelf=movies");
    expect(publicHref("akshaj", "anime", { shelf: "anime", status: "completed", item: "t1" })).toBe("/u/akshaj?status=completed&item=t1");
  });
});
