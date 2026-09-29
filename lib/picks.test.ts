// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TasteItem } from "@/lib/recommend";
import type { DiscoverFilter } from "@/lib/search/types";

const categories = [
  { id: "a", name: "Anime", slug: "anime", kind: "anime", color: "crimson", icon: "tv", position: 0, itemCount: 2 },
  { id: "f", name: "Movies", slug: "movies", kind: "movie", color: "amber", icon: "film", position: 1, itemCount: 1 },
  { id: "b", name: "Books", slug: "books", kind: "custom", color: "teal", icon: "book", position: 2, itemCount: 1 },
];

const row = (overrides: Partial<TasteItem>): TasteItem => ({
  id: "00000000-0000-4000-8000-000000000000",
  title: "Title",
  category_id: "a",
  status: "completed",
  rating: null,
  genres: [],
  tags: null,
  finished_at: null,
  runtime_minutes: null,
  progress_total: null,
  community_score: null,
  source: "manual",
  external_id: null,
  is_favorite: false,
  format: null,
  cover_url: null,
  accent_color: null,
  year: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

const library = [
  row({ id: "1", title: "Frieren", rating: 10, source: "anilist", external_id: "154587" }),
  row({ id: "2", title: "Planned film", category_id: "f", status: "planned", source: "tmdb", external_id: "9" }),
  row({ id: "3", title: "A book", category_id: "b", status: "planned" }),
];

vi.mock("@/lib/queries", () => ({
  getCategories: async () => categories,
  getTasteItems: async () => library,
  getDismissedPicks: async () => ({ keys: new Set(["anilist:99"]), about: [{ genres: ["Horror"], tags: ["Gore"] }] }),
}));

const getSuggestions = vi.fn();
const discoverTitles = vi.fn();
const resolveWord = vi.fn();
vi.mock("@/lib/search", () => ({
  getSuggestions: (...args: unknown[]) => getSuggestions(...args),
  discoverTitles: (filter: DiscoverFilter) => discoverTitles(filter),
  resolveWord: (...args: unknown[]) => resolveWord(...args),
}));

const { loadPickContext, moodPicksFor, recommendedPicks } = await import("./picks");
const { readMood } = await import("./moods");

const anime = (id: string, title = `Anime ${id}`) => ({ result: { source: "anilist", externalId: id, title } });

beforeEach(() => {
  getSuggestions.mockReset();
  discoverTitles.mockReset();
  resolveWord.mockReset();
  resolveWord.mockResolvedValue({ filter: null });
  getSuggestions.mockResolvedValue({ results: [{ seed: "154587", suggestions: [anime("21827", "Violet Evergarden"), anime("99")] }] });
});

describe("loadPickContext", () => {
  it("offers shelves with a Planned title or a favourite to ask about", async () => {
    const context = await loadPickContext();
    expect(context.offered.map((shelf) => shelf.slug)).toEqual(["anime", "movies", "books"]);
    expect(context.seeds.get("anime")?.map((seed) => seed.item.title)).toEqual(["Frieren"]);
    expect(context.dismissed.has("anilist:99")).toBe(true);
  });
});

describe("recommendedPicks", () => {
  it("files picks on the favourite's shelf, and says why the others have none", async () => {
    const { picks, notices } = await recommendedPicks(await loadPickContext());
    expect(picks).toEqual([
      { key: "anilist:21827", result: expect.objectContaining({ title: "Violet Evergarden" }), categoryId: "a", reason: "Because you loved Frieren" },
    ]);
    expect(notices).toEqual({
      f: "Rate a few Movies titles 8 or more, or star one, and picks show up here.",
      b: "A shelf of your own has nobody to ask for new titles, so your list above is the lot.",
    });
  });
});

describe("moodPicksFor", () => {
  it("asks each shelf's provider for the mood, and needs no favourites to fill a shelf", async () => {
    discoverTitles.mockImplementation(async (filter: DiscoverFilter) =>
      filter.kind === "anime"
        ? { results: [anime("5114", "Fullmetal Alchemist: Brotherhood"), anime("21827", "Violet Evergarden")] }
        : { results: [{ result: { source: "tmdb", externalId: "424", title: "Schindler's List" } }] },
    );
    const { picks, notices } = await moodPicksFor(await loadPickContext(), readMood("war")!);

    expect(discoverTitles).toHaveBeenCalledWith({ kind: "anime", anilist: { tags: ["Military", "War"] } });
    expect(discoverTitles).toHaveBeenCalledWith({ kind: "movie", tmdb: { genres: [10752] } });
    // Violet Evergarden is one Frieren points at too, so it goes first, with that reason.
    expect(picks.map((pick) => [pick.result.title, pick.categoryId, pick.reason])).toEqual([
      ["Violet Evergarden", "a", "Because you loved Frieren"],
      ["Fullmetal Alchemist: Brotherhood", "a", "One of the best rated"],
      ["Schindler's List", "f", "One of the best rated"],
    ]);
    expect(notices).toEqual({ b: "A shelf of your own has nobody to ask for new titles, so your list above is the lot." });
  });

  it("says when a provider fails, or has nothing new left", async () => {
    discoverTitles.mockImplementation(async (filter: DiscoverFilter) =>
      filter.kind === "anime" ? { results: [], error: "unavailable" } : { results: [{ result: { source: "tmdb", externalId: "9", title: "Planned film" } }] },
    );
    const { picks, notices } = await moodPicksFor(await loadPickContext(), readMood("romance")!);
    expect(picks).toEqual([]);
    expect(notices.a).toBe("AniList isn't answering right now. Try again in a bit.");
    expect(notices.f).toBe("Nothing new here for this mood. You've seen the lot.");
  });

  it("looks a typed word up on each shelf's provider, and asks for what it means there", async () => {
    resolveWord.mockImplementation(async (kind: string) =>
      kind === "movie" ? { filter: { kind: "movie", tmdb: { keywords: [10051] } } } : { filter: null },
    );
    discoverTitles.mockResolvedValue({ results: [{ result: { source: "tmdb", externalId: "27205", title: "Inception" } }] });
    const { picks, notices } = await moodPicksFor(await loadPickContext(), readMood("heist")!);
    expect(resolveWord).toHaveBeenCalledWith("anime", "heist");
    expect(resolveWord).toHaveBeenCalledWith("movie", "heist");
    expect(discoverTitles).toHaveBeenCalledExactlyOnceWith({ kind: "movie", tmdb: { keywords: [10051] } });
    expect(picks.map((pick) => [pick.result.title, pick.categoryId])).toEqual([["Inception", "f"]]);
    expect(notices.a).toBe("Nothing on AniList matches “heist”.");
  });

  it("says when looking a typed word up fails", async () => {
    resolveWord.mockResolvedValue({ filter: null, error: "unavailable" });
    const { notices } = await moodPicksFor(await loadPickContext(), readMood("heist")!);
    expect(notices.f).toBe("TMDB isn't answering right now. Try again in a bit.");
  });

  it("says plainly when a typed word matches nothing", async () => {
    const { picks, notices } = await moodPicksFor(await loadPickContext(), readMood("heist")!);
    expect(discoverTitles).not.toHaveBeenCalled();
    expect(picks).toEqual([]);
    expect(notices.a).toBe("Nothing on AniList matches “heist”.");
    expect(notices.f).toBe("Nothing on TMDB matches “heist”.");
  });
});
