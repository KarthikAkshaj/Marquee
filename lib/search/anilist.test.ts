// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import frieren from "./__fixtures__/anilist-frieren.json";
import onePiece from "./__fixtures__/anilist-one-piece.json";
import { getAniListSeries, normaliseAniList, searchAniList, searchAniListMany, searchAniListOther } from "./anilist";
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

describe("searchAniListOther", () => {
  afterEach(() => vi.unstubAllGlobals());

  const comic = (english: string | null, country: string, format = "MANGA", romaji = english) => ({
    title: { english, romaji },
    format,
    countryOfOrigin: country,
  });

  it("names what AniList has instead, by where the comic is from", async () => {
    const fetch = reply({
      data: {
        q0: { media: [comic("The Greatest Estate Developer", "KR")] },
        q1: { media: [comic("Berserk", "JP")] },
        q2: { media: [comic("Tales of Demons and Gods", "CN")] },
        q3: { media: [comic("Overlord", "JP", "NOVEL")] },
      },
    });
    vi.stubGlobal("fetch", fetch);

    expect(await searchAniListOther(["The Greatest Estate Developer", "Berserk", "Tales of Demons and Gods", "Overlord"])).toEqual([
      { form: "manhwa", title: "The Greatest Estate Developer" },
      { form: "manga", title: "Berserk" },
      { form: "manhua", title: "Tales of Demons and Gods" },
      { form: "light novel", title: "Overlord" },
    ]);

    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.query).toContain("type: MANGA");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("explains nothing when the comic found isn't the title asked about", async () => {
    vi.stubGlobal("fetch", reply({ data: { q0: { media: [comic("Something Else Entirely", "JP")] }, q1: { media: [] } } }));
    expect(await searchAniListOther(["The Greatest Estate Developer", "Nothing At All"])).toEqual([null, null]);
  });

  it("matches on the romaji name too, and refuses more than ten at once", async () => {
    vi.stubGlobal("fetch", reply({ data: { q0: { media: [comic(null, "JP", "MANGA", "Sousou no Frieren")] } } }));
    expect(await searchAniListOther(["Sousou no Frieren"])).toEqual([{ form: "manga", title: "Sousou no Frieren" }]);
    await expect(searchAniListOther(Array.from({ length: 11 }, (_, i) => `t${i}`))).rejects.toThrow("too many searches");
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
