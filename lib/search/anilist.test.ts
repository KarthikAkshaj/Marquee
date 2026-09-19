// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import frieren from "./__fixtures__/anilist-frieren.json";
import onePiece from "./__fixtures__/anilist-one-piece.json";
import { searchAniList, searchAniListMany } from "./anilist";
import { ProviderError } from "./types";

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("searchAniList", () => {
  afterEach(() => vi.unstubAllGlobals());

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
    expect(body.query).toContain("q2: Page(perPage: 5)");
    expect(body.query).toContain("isAdult: false");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses more than ten at once", async () => {
    await expect(searchAniListMany(Array.from({ length: 11 }, (_, i) => `t${i}`))).rejects.toThrow("too many searches");
  });
});
