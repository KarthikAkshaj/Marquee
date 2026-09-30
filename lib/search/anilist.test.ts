// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import frieren from "./__fixtures__/anilist-frieren.json";
import onePiece from "./__fixtures__/anilist-one-piece.json";
import mushoku from "./__fixtures__/anilist-reading-mushoku-tensei.json";
import suggested from "./__fixtures__/anilist-suggestions-frieren-mushishi.json";
import military from "./__fixtures__/anilist-discover-military.json";
import tagged from "./__fixtures__/anilist-tags.json";
import {
  LATER_SEASON,
  discoverAniList,
  getAniListTags,
  getAniListVocabulary,
  mainTags,
  getAniListSeries,
  getAniListSuggestions,
  normaliseAniList,
  normaliseAniListReading,
  normaliseSeed,
  type AniListSeed,
  readingFormat,
  searchAniList,
  searchAniListMany,
  searchAniListReading,
  searchAniListReadingMany,
} from "./anilist";
import { ProviderError } from "./types";

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("searchAniList", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the shape and the running time AniList already tells it", () => {
    const media = {
      id: 21519,
      title: { english: "Your Name.", romaji: "Kimi no Na wa." },
      status: "FINISHED",
      episodes: 1,
      startDate: { year: 2016 },
      coverImage: null,
      bannerImage: null,
      genres: ["Drama", "Romance"],
      averageScore: 85,
    };
    // A film: one "episode" of 107 minutes, not one episode of 24.
    expect(normaliseAniList({ ...media, format: "MOVIE", duration: 107 })).toMatchObject({
      format: "movie",
      runtimeMinutes: 107,
      progressTotal: 1,
    });
    // An OVA looks identical on the row without this, and runs a quarter as long.
    expect(normaliseAniList({ ...media, format: "OVA", duration: 27 })).toMatchObject({
      format: "ova",
      runtimeMinutes: 27,
    });
    // A shape we have no word for is left empty rather than guessed at.
    expect(normaliseAniList({ ...media, format: "MUSIC", duration: 5 })?.format).toBeUndefined();
  });

  it("normalises a finished show with everything the add flow needs", async () => {
    vi.stubGlobal("fetch", reply(frieren));
    const [first] = await searchAniList("frieren");
    expect(first).toEqual({
      source: "anilist",
      externalId: "154587",
      title: "Frieren: Beyond Journey’s End",
      altTitle: "Sousou no Frieren",
      year: 2023,
      coverUrl: expect.stringMatching(/^https:\/\/s4\.anilist\.co\/.+bx154587/),
      backdropUrl: expect.stringMatching(/^https:\/\/s4\.anilist\.co\/.+banner/),
      progressTotal: 28,
      subtitle: "TV · 28 eps",
      genres: ["Adventure", "Drama", "Fantasy"],
      tags: [],
      communityScore: 91,
      accentColor: "#bbf1a1",
      runtimeMinutes: 24,
      format: "tv",
    });
  });

  it("falls back to the romaji title and leaves out what AniList doesn't know", async () => {
    vi.stubGlobal("fetch", reply(frieren));
    const upcoming = (await searchAniList("frieren"))[1];
    expect(upcoming).toMatchObject({ title: "Sousou no Frieren 3rd Season", year: 2027, subtitle: "TV · Upcoming" });
    expect(upcoming.progressTotal).toBeUndefined();
    expect(upcoming.communityScore).toBeUndefined();
    expect(upcoming.backdropUrl).toBeUndefined();
  });

  it("adds airing and upcoming shows without an episode total", async () => {
    vi.stubGlobal("fetch", reply(onePiece));
    const [airing, announced, movie] = await searchAniList("one piece");
    expect(airing).toMatchObject({ title: "ONE PIECE", subtitle: "TV · Airing", year: 1999 });
    expect(airing.progressTotal).toBeUndefined();
    // AniList lists 7 planned episodes, but that isn't final until it airs.
    expect(announced.progressTotal).toBeUndefined();
    expect(announced.subtitle).toBe("Upcoming");
    expect(movie).toMatchObject({ subtitle: "Movie · 50 min", progressTotal: 1 });
  });

  it("asks for safe-for-work anime only, a page of eight", async () => {
    const fetch = reply(frieren);
    vi.stubGlobal("fetch", fetch);
    await searchAniList("frieren");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graphql.anilist.co");
    const body = JSON.parse(String(init.body));
    expect(body.variables).toEqual({ search: "frieren", perPage: 8 });
    expect(body.query).toContain("isAdult: false");
    expect(body.query).toContain("type: ANIME");
  });

  it("turns rate limits and odd responses into a ProviderError", async () => {
    vi.stubGlobal("fetch", reply({ errors: [{ message: "Too Many Requests." }] }, 429));
    await expect(searchAniList("frieren")).rejects.toMatchObject({ provider: "anilist", status: 429 });

    vi.stubGlobal("fetch", reply({ data: null }));
    await expect(searchAniList("frieren")).rejects.toBeInstanceOf(ProviderError);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(searchAniList("frieren")).rejects.toThrow("anilist: network error");
  });
});

describe("searchAniListMany", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends up to ten searches as one aliased request and splits the answers back out", async () => {
    const [first, second] = frieren.data.Page.media;
    const fetch = reply({ data: { q0: { media: [first] }, q1: { media: [] }, q2: { media: [second, first] } } });
    vi.stubGlobal("fetch", fetch);

    const results = await searchAniListMany(["frieren", "nothing here", "sousou"]);
    expect(results.map((list) => list.map((result) => result.externalId))).toEqual([["154587"], [], [String(second.id), "154587"]]);

    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.variables).toEqual({ s0: "frieren", s1: "nothing here", s2: "sousou" });
    expect(body.query).toContain("q2: Page(perPage: 6)");
    expect(body.query).toContain("isAdult: false");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses more than ten at once", async () => {
    await expect(searchAniListMany(Array.from({ length: 11 }, (_, i) => `t${i}`))).rejects.toThrow("too many searches");
  });
});

describe("comics and novels (U5)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const comic = (english: string | null, country: string, format = "MANGA", extra: Record<string, unknown> = {}) => ({
    id: 140407,
    title: { english, romaji: english },
    format,
    status: "FINISHED",
    countryOfOrigin: country,
    chapters: 222,
    volumes: null,
    startDate: { year: 2021 },
    coverImage: { extraLarge: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx140407.jpg", color: "#e4a15d" },
    bannerImage: null,
    genres: ["Comedy", "Fantasy"],
    averageScore: 90,
    ...extra,
  });

  it("names a comic by where it's from, and a novel by whether it's Japanese", () => {
    expect(readingFormat({ format: "MANGA", countryOfOrigin: "KR" })).toBe("manhwa");
    expect(readingFormat({ format: "MANGA", countryOfOrigin: "CN" })).toBe("manhua");
    expect(readingFormat({ format: "MANGA", countryOfOrigin: "TW" })).toBe("manhua");
    expect(readingFormat({ format: "MANGA", countryOfOrigin: "JP" })).toBe("manga");
    expect(readingFormat({ format: "ONE_SHOT", countryOfOrigin: "JP" })).toBe("manga");
    expect(readingFormat({ format: "NOVEL", countryOfOrigin: "JP" })).toBe("light_novel");
    expect(readingFormat({ format: "NOVEL", countryOfOrigin: "KR" })).toBe("novel");
  });

  it("says what it is on the result line, and counts chapters where episodes would go", () => {
    expect(normaliseAniListReading(comic("The Greatest Estate Developer", "KR"))).toMatchObject({
      source: "anilist",
      externalId: "140407",
      title: "The Greatest Estate Developer",
      format: "manhwa",
      subtitle: "Manhwa · 222 ch",
      progressTotal: 222,
      communityScore: 90,
      accentColor: "#e4a15d",
    });
    // Still coming out, or paused: the chapter count isn't final, so there's no total to finish at.
    expect(normaliseAniListReading(comic("Frieren", "JP", "MANGA", { status: "RELEASING", chapters: null }))).toMatchObject({
      subtitle: "Manga · Releasing",
      progressTotal: undefined,
    });
    expect(normaliseAniListReading(comic("Berserk", "JP", "MANGA", { status: "HIATUS", chapters: 380 }))).toMatchObject({
      subtitle: "Manga · On hiatus",
      progressTotal: undefined,
    });
    // A novel counted in volumes only.
    expect(normaliseAniListReading(comic("Overlord", "JP", "NOVEL", { chapters: null, volumes: 16 }))?.subtitle).toBe("Light novel · 16 vols");
    // A comic never has a running time.
    expect(normaliseAniListReading(comic("Solo Leveling", "KR", "MANGA", { duration: 24 }))?.runtimeMinutes).toBeUndefined();
  });

  it("searches AniList's comics, and tells two with the same name apart", async () => {
    const fetch = reply(mushoku);
    vi.stubGlobal("fetch", fetch);
    const results = await searchAniListReading("mushoku tensei");

    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.query).toContain("type: MANGA");
    expect(body.query).toContain("chapters");
    const jobless = results.filter((result) => result.title === "Mushoku Tensei: Jobless Reincarnation");
    expect(jobless.map((result) => result.subtitle)).toEqual(["Manga · Releasing", "Light novel · 334 ch"]);
    expect(jobless[1]).toMatchObject({ format: "light_novel", progressTotal: 334 });
  });

  it("offers the comics a missed title really is, and nothing that only looks like it", async () => {
    const fetch = reply({
      data: {
        q0: { media: [comic("The Greatest Estate Developer", "KR"), comic("Something Else Entirely", "KR", "MANGA", { id: 9 })] },
        q1: { media: [comic("Something Else Entirely", "JP")] },
        q2: { media: [comic(null, "JP", "MANGA", { id: 118586, title: { english: null, romaji: "Sousou no Frieren" } })] },
      },
    });
    vi.stubGlobal("fetch", fetch);

    const [estate, nothing, frierenManga] = await searchAniListReadingMany(["The Greatest Estate Developer", "Nothing At All", "Sousou no Frieren"]);
    expect(estate.map((result) => [result.title, result.format])).toEqual([["The Greatest Estate Developer", "manhwa"]]);
    expect(nothing).toEqual([]);
    // Matched on the romaji name when there's no English one.
    expect(frierenManga[0]).toMatchObject({ externalId: "118586", format: "manga" });
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(searchAniListReadingMany(Array.from({ length: 11 }, (_, i) => `t${i}`))).rejects.toThrow("too many searches");
  });
});

describe("junk and series", () => {
  afterEach(() => vi.unstubAllGlobals());

  type Link = [relation: string, id: number];
  const shows: Record<number, { year: number | null; format: string; status?: string; adult?: boolean; title: string; links: Link[] }> = {
    1: { year: 2020, format: "TV", title: "Jujutsu Kaisen", links: [["SEQUEL", 3], ["PREQUEL", 2], ["ADAPTATION", 99]] },
    2: { year: 2021, format: "MOVIE", title: "Jujutsu Kaisen 0", links: [["SEQUEL", 1], ["SEQUEL", 8]] },
    3: { year: 2023, format: "TV", title: "Jujutsu Kaisen Season 2", links: [["PREQUEL", 1], ["SEQUEL", 4], ["SIDE_STORY", 7]] },
    4: { year: 2026, format: "TV", status: "RELEASING", title: "Culling Game", links: [["PREQUEL", 3], ["SEQUEL", 5]] },
    5: { year: null, format: "TV", status: "NOT_YET_RELEASED", title: "Culling Game Part 2", links: [["PREQUEL", 4], ["SEQUEL", 6]] },
    6: { year: 2027, format: "TV", adult: true, title: "Not this", links: [["PREQUEL", 5]] },
    7: { year: 2024, format: "SPECIAL", title: "Side story", links: [["PARENT", 3]] },
    8: { year: 2022, format: "MUSIC", title: "Opening", links: [["PREQUEL", 2]] },
  };
  const fields = (id: number) => {
    const show = shows[id];
    return {
      id,
      type: "ANIME",
      isAdult: Boolean(show.adult),
      title: { english: show.title, romaji: null },
      format: show.format,
      status: show.status ?? "FINISHED",
      startDate: { year: show.year, month: 1, day: 1 },
    };
  };
  type Edges = { edges: { relationType: string; node: Record<string, unknown> }[] };
  const edges = (id: number, deeper: boolean): Edges => ({
    edges: shows[id].links.map(([relationType, to]) => ({
      relationType,
      node: shows[to]
        ? { ...fields(to), ...(deeper ? { relations: edges(to, false) } : {}) }
        : { id: to, type: "MANGA", isAdult: false, title: { english: "The manga", romaji: null } },
    })),
  });
  const graph = vi.fn(async (_url: string, init: RequestInit) => {
    const { ids } = JSON.parse(String(init.body)).variables as { ids: number[] };
    const media = ids.map((id) => ({ ...fields(id), relations: edges(id, true) }));
    return new Response(JSON.stringify({ data: { Page: { media } } }), { headers: { "Content-Type": "application/json" } });
  });

  it("follows prequels and sequels two steps a request, oldest first, leaving out the rest", async () => {
    vi.stubGlobal("fetch", graph);
    const series = await getAniListSeries(1);
    expect(series.map((entry) => [entry.externalId, entry.release])).toEqual([
      ["1", "out"],
      ["2", "out"],
      ["3", "out"],
      ["4", "airing"],
      ["5", "upcoming"],
    ]);
    expect(graph).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String((graph.mock.calls[1] as unknown as [string, RequestInit])[1].body)).variables.ids).toEqual([4, 8]);
  });

  it("drops promo videos and music from matches unless that's all there is", async () => {
    const [first] = frieren.data.Page.media;
    const pv = { ...first, id: 1, title: { english: null, romaji: "Sousou no Frieren PV" }, format: "ONA" };
    const song = { ...first, id: 2, format: "MUSIC" };
    vi.stubGlobal("fetch", reply({ data: { q0: { media: [pv, first, song] }, q1: { media: [pv] } } }));
    const [matches, onlyJunk] = await searchAniListMany(["frieren", "frieren pv"]);
    expect(matches.map((result) => result.externalId)).toEqual(["154587"]);
    expect(onlyJunk.map((result) => result.externalId)).toEqual(["1"]);
  });
});

describe("suggestions for For you (SPEC §20)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks about every seed in one request and keeps AniList's order", async () => {
    const fetch = reply(suggested);
    vi.stubGlobal("fetch", fetch);
    const answers = await getAniListSuggestions(["154587", "457", "154587", "nope"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.variables).toEqual({ ids: [154587, 457] });

    const frieren = answers.find((answer) => answer.seed === "154587")!;
    expect(frieren.suggestions.slice(0, 3).map(({ result }) => result.title)).toEqual([
      "Violet Evergarden",
      "Delicious in Dungeon",
      "Wandering Witch: The Journey of Elaina",
    ]);
    expect(frieren.suggestions[0].result).toMatchObject({ source: "anilist", externalId: "21827", genres: expect.arrayContaining(["Drama"]) });
  });

  it("doesn't call a title a later season because a film comes before it", () => {
    const [mushishi] = (suggested.data.Page.media as AniListSeed[]).filter((seed) => seed.id === 457);
    const kino = normaliseSeed(mushishi).suggestions.find(({ result }) => result.title === "Kino's Journey")!;
    expect(kino.follows).toBeUndefined();
  });

  it("marks what continues something, and drops adult, unreleased and one-vote picks", () => {
    const node = (id: number, overrides: Record<string, unknown> = {}) => ({
      rating: 50,
      mediaRecommendation: { id, type: "ANIME", status: "FINISHED", isAdult: false, title: { english: `Show ${id}` }, ...overrides },
    });
    const seed: AniListSeed = {
      id: 1,
      recommendations: {
        nodes: [
          node(2, { relations: { edges: [{ relationType: "PREQUEL", node: { id: 9, type: "ANIME", format: "TV" } }] } }),
          node(3, { isAdult: true }),
          node(4, { status: "NOT_YET_RELEASED" }),
          { ...node(5), rating: 1 },
          node(6, { type: "MANGA" }),
          node(7),
          node(8, { format: "MOVIE", relations: { edges: [{ relationType: "PREQUEL", node: { id: 10, type: "ANIME", format: "MOVIE" } }] } }),
          node(11, { format: "TV", relations: { edges: [{ relationType: "PREQUEL", node: { id: 12, type: "ANIME", format: "MOVIE" } }] } }),
          node(13, { format: "OVA", relations: { edges: [{ relationType: "PARENT", node: { id: 14, type: "ANIME", format: "TV" } }] } }),
          node(15, { format: "TV", relations: { edges: [{ relationType: "PARENT", node: { id: 16, type: "ANIME", format: "TV" } }] } }),
          node(17, { format: "OVA", episodes: 110, relations: { edges: [{ relationType: "PREQUEL", node: { id: 18, type: "ANIME", format: "MOVIE" } }] } }),
          node(19, {
            format: "TV",
            title: { english: "Saga of Tanya the Evil Season 2" },
            relations: { edges: [{ relationType: "PREQUEL", node: { id: 20, type: "ANIME", format: "MOVIE" } }] },
          }),
        ],
      },
    };
    expect(normaliseSeed(seed)).toEqual({
      seed: "1",
      suggestions: [
        { result: expect.objectContaining({ externalId: "2" }), follows: ["9"] },
        { result: expect.objectContaining({ externalId: "7" }) },
        // A film after a film continues it; a TV run after a film doesn't.
        { result: expect.objectContaining({ externalId: "8" }), follows: ["10"] },
        { result: expect.objectContaining({ externalId: "11" }) },
        // A special hangs off its series; a TV run with a parent is its own show.
        { result: expect.objectContaining({ externalId: "13" }), follows: ["14"] },
        { result: expect.objectContaining({ externalId: "15" }) },
        // A 110-episode OVA is a series of its own (Legend of the Galactic Heroes).
        { result: expect.objectContaining({ externalId: "17" }) },
        // Named as a later season, so it continues whatever is listed before it.
        { result: expect.objectContaining({ externalId: "19" }), follows: ["20"] },
      ],
    });
  });

  it("asks for nothing without seeds, and refuses more than a batch", async () => {
    const fetch = reply(suggested);
    vi.stubGlobal("fetch", fetch);
    expect(await getAniListSuggestions([])).toEqual([]);
    await expect(getAniListSuggestions(Array.from({ length: 11 }, (_, index) => String(index + 1)))).rejects.toBeInstanceOf(ProviderError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("moods (SPEC §20)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks for a mood's tags, and marks the later seasons among the best-scored", async () => {
    const fetch = reply(military);
    vi.stubGlobal("fetch", fetch);
    const found = await discoverAniList({ tags: ["Military", "War"] });
    const sent = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.variables).toEqual({ tags: ["Military", "War"] });
    expect(sent.query).toContain("minimumTagRank: 60");

    expect(found[0].result).toMatchObject({ source: "anilist", title: "Fullmetal Alchemist: Brotherhood" });
    expect(found[0].follows).toBeUndefined();
    const aot = found.find(({ result }) => result.title === "Attack on Titan Season 3 Part 2")!;
    expect(aot.follows).toHaveLength(1);
    expect(found.filter((entry) => entry.follows).length).toBeGreaterThan(10);
  });

  it("asks nothing for an empty filter", async () => {
    const fetch = reply(military);
    vi.stubGlobal("fetch", fetch);
    expect(await discoverAniList({})).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks for the best of all with no mood, and narrows to what could fit a length (Surprise me)", async () => {
    const fetch = reply(military);
    vi.stubGlobal("fetch", fetch);
    await discoverAniList({}, { anyMood: true, length: "hour" });
    const sent = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.variables).toEqual({
      formats: ["MOVIE", "OVA", "ONA", "SPECIAL", "TV_SHORT"],
      statuses: ["FINISHED"],
      episodesLesser: 13,
      durationLesser: 61,
    });
    expect(sent.query).toContain("episodes_lesser: $episodesLesser");

    await discoverAniList({ genres: ["Romance"] }, { length: "weekend" });
    const weekend = JSON.parse(String((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(weekend.variables).toMatchObject({ genres: ["Romance"], formats: ["TV", "ONA", "OVA", "TV_SHORT"], episodesGreater: 3, episodesLesser: 40 });
  });
});

describe("LATER_SEASON", () => {
  it("knows a later season by its name, and leaves standalone names alone", () => {
    for (const name of ["Saga of Tanya the Evil Season 2", "Attack on Titan Final Season", "Vinland Saga Season 2", "Kaguya-sama 2nd Season", "Re:ZERO Part 2", "Season II", "Mob Psycho 100 III Cour 2"]) {
      expect(LATER_SEASON.test(name), name).toBe(true);
    }
    for (const name of ["86 EIGHTY-SIX", "Mob Psycho 100", "Seasons of Love", "Part-Timer", "The Final Countdown"]) {
      expect(LATER_SEASON.test(name), name).toBe(false);
    }
  });
});

describe("getAniListVocabulary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps every genre and tag a mood can be, and leaves the adult ones out", async () => {
    vi.stubGlobal(
      "fetch",
      reply({
        data: {
          GenreCollection: ["Action", "Ecchi", "Hentai", "Romance"],
          MediaTagCollection: [
            { name: "Military", isAdult: false },
            { name: "Nudity", isAdult: true },
            { name: "Iyashikei", isAdult: false },
          ],
        },
      }),
    );
    expect(await getAniListVocabulary()).toEqual({ genres: ["Action", "Romance"], tags: ["Military", "Iyashikei"] });
  });
});

describe("tags (SPEC §20)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps what a show is mostly about: no spoilers, nothing adult, nothing about the cast or the drawing", () => {
    const frieren = tagged.data.Page.media.find((media) => media.id === 154587)!;
    const kept = mainTags(frieren.tags);
    expect(kept).toEqual(["Travel", "Magic", "Philosophy", "Medieval", "Found Family", "Foreign", "Iyashikei", "Adoption"]);
    expect(kept).not.toContain("Time Skip");
    expect(kept).not.toContain("Female Protagonist");
    expect(mainTags(null)).toEqual([]);
  });

  it("looks up the tags of many titles in one request", async () => {
    const fetch = reply(tagged);
    vi.stubGlobal("fetch", fetch);
    const tags = await getAniListTags(["154587", "16498", "105398", "x"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(tags.get("16498")).toEqual(expect.arrayContaining(["Military", "Survival"]));
    expect(tags.get("16498")).not.toContain("Memory Manipulation");
    expect(await getAniListTags([])).toEqual(new Map());
  });
});
