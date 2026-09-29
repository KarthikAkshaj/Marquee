// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import hades from "./__fixtures__/igdb-hades.json";
import similar from "./__fixtures__/igdb-similar-witcher-celeste.json";
import warfare from "./__fixtures__/igdb-discover-warfare.json";
import themed from "./__fixtures__/igdb-tags.json";
import {
  discoverIgdb,
  findIgdbKeywords,
  getIgdbSuggestions,
  getIgdbTags,
  getIgdbVocabulary,
  normaliseIgdbGame,
  igdbDiscoverBody,
  igdbConfigured,
  igdbSearchBody,
  igdbSimilarBody,
  normaliseSimilar,
  resetIgdbToken,
  searchIgdb,
  type IgdbSeed,
} from "./igdb";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function twitch({ gameStatuses = [200] }: { gameStatuses?: number[] } = {}) {
  let tokens = 0;
  let gameCalls = 0;
  const fetch = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async (input) => {
    if (input.startsWith("https://id.twitch.tv/")) {
      tokens += 1;
      return json({ access_token: `token-${tokens}`, expires_in: 5_000_000, token_type: "bearer" });
    }
    const status = gameStatuses[Math.min(gameCalls, gameStatuses.length - 1)];
    gameCalls += 1;
    return status === 200 ? json(hades) : json({ message: "Authorization Failure" }, status);
  });
  return { fetch, tokenCount: () => tokens, authHeaders: () => fetch.mock.calls.filter(([url]) => url.includes("igdb.com")).map(([, init]) => (init?.headers as Record<string, string>).Authorization) };
}

describe("IGDB", () => {
  beforeEach(() => {
    vi.stubEnv("TWITCH_CLIENT_ID", "client-id");
    vi.stubEnv("TWITCH_CLIENT_SECRET", "client-secret");
    resetIgdbToken();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("needs both Twitch keys", () => {
    expect(igdbConfigured()).toBe(true);
    vi.stubEnv("TWITCH_CLIENT_SECRET", "");
    expect(igdbConfigured()).toBe(false);
  });

  it("puts the well-known game first and normalises it", async () => {
    vi.stubGlobal("fetch", twitch().fetch);
    const results = await searchIgdb("hades");
    expect(results.map((r) => `${r.title} ${r.year}`).slice(0, 3)).toEqual(["Hades 2020", "Hades II 2025", "Hades 1995"]);
    expect(results[0]).toEqual({
      source: "igdb",
      externalId: "113112",
      title: "Hades",
      year: 2020,
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/cob9kr.jpg",
      backdropUrl: expect.stringMatching(/^https:\/\/images\.igdb\.com\/igdb\/image\/upload\/t_1080p\/\w+\.jpg$/),
      subtitle: "Series X|S, PS4, PC +5",
      genres: ["Role-playing (RPG)", "Hack and slash/Beat 'em up", "Adventure", "Indie"],
      tags: [],
      communityScore: 91,
    });
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it("reuses one Twitch token across searches", async () => {
    const mock = twitch();
    vi.stubGlobal("fetch", mock.fetch);
    await searchIgdb("hades");
    await searchIgdb("hades ii");
    expect(mock.tokenCount()).toBe(1);
    expect(mock.authHeaders()).toEqual(["Bearer token-1", "Bearer token-1"]);
  });

  it("gets a fresh token once when IGDB rejects the current one", async () => {
    const mock = twitch({ gameStatuses: [401, 200] });
    vi.stubGlobal("fetch", mock.fetch);
    expect(await searchIgdb("hades")).not.toHaveLength(0);
    expect(mock.authHeaders()).toEqual(["Bearer token-1", "Bearer token-2"]);

    const stuck = twitch({ gameStatuses: [401] });
    resetIgdbToken();
    vi.stubGlobal("fetch", stuck.fetch);
    await expect(searchIgdb("hades")).rejects.toMatchObject({ provider: "igdb", status: 401 });
    expect(stuck.tokenCount()).toBe(2);
  });

  it("keeps the search term inside its quotes and leaves out DLC and bundles", () => {
    const body = igdbSearchBody('hades"; fields *; \\');
    expect(body).toMatch(/^search "hades ; fields \*;";/);
    expect(body).toContain("where version_parent = null & game_type = (0,2,4,8,9,10,11);");
  });

  it("asks for similar games in one request, most-rated first", async () => {
    const fetch = vi.fn(async (input: string) =>
      input.startsWith("https://id.twitch.tv/") ? json({ access_token: "token", expires_in: 5_000_000 }) : json(similar),
    );
    vi.stubGlobal("fetch", fetch);
    const answers = await getIgdbSuggestions(["1942", "26226", "1942"]);
    const body = String((fetch.mock.calls.find(([url]) => url.includes("igdb.com")) as unknown as [string, RequestInit])[1].body);
    expect(body).toContain("where id = (1942,26226);");

    const witcher = answers.find((answer) => answer.seed === "1942")!;
    expect(witcher.suggestions.slice(0, 3).map(({ result }) => result.title)).toEqual([
      "Red Dead Redemption 2",
      "The Legend of Zelda: Breath of the Wild",
      "Elden Ring",
    ]);
    expect(witcher.suggestions[0].result).toMatchObject({ source: "igdb", externalId: "25076", year: 2018 });
  });

  it("drops DLC, editions, unreleased and hardly-rated similar games", () => {
    const game = (id: number, overrides: Record<string, unknown> = {}) => ({
      id,
      name: `Game ${id}`,
      first_release_date: 1_600_000_000,
      total_rating_count: 50,
      game_type: 0,
      ...overrides,
    });
    const seed: IgdbSeed = {
      id: 1,
      similar_games: [
        game(2),
        game(3, { game_type: 1 }),
        game(4, { version_parent: 99 }),
        game(5, { first_release_date: 4_000_000_000 }),
        game(6, { first_release_date: null }),
        game(7, { total_rating_count: 3 }),
      ],
    };
    expect(normaliseSimilar(seed, 1_700_000_000_000).suggestions.map(({ result }) => result.externalId)).toEqual(["2"]);
    expect(igdbSimilarBody([1, 2])).toMatch(/^fields id,similar_games\.name,.*; where id = \(1,2\); limit 2;$/);
  });

  it("asks for any of a mood's themes, genres or keywords, main games that are out, best rated first", () => {
    const body = igdbDiscoverBody({ themes: [39], keywords: [24685, 23931] }, 1_700_000_000_000)!;
    expect(body).toContain("where (themes = (39) | keywords = (24685,23931)) & game_type = (0,2,4,8,9,10,11) & version_parent = null");
    expect(body).toContain("& total_rating_count >= 100 & first_release_date < 1700000000;");
    expect(body).toContain("sort total_rating desc;");
    expect(igdbDiscoverBody({ themes: [], genres: [1.5] })).toBeNull();
  });

  it("returns a mood's games in IGDB's order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => (input.startsWith("https://id.twitch.tv/") ? json({ access_token: "token", expires_in: 5_000_000 }) : json(warfare))),
    );
    const found = await discoverIgdb({ themes: [39] });
    expect(found.slice(0, 2).map(({ result }) => result.title)).toEqual(["Advance Wars", "TimeSplitters 2"]);
    expect(found[0].result.source).toBe("igdb");
    expect(await discoverIgdb({})).toEqual([]);
  });

  it("reads IGDB's themes and genres, and finds keywords by exact name", async () => {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input.startsWith("https://id.twitch.tv/")) return json({ access_token: "token", expires_in: 5_000_000 });
        calls.push({ url: input, body: String(init?.body) });
        if (input.endsWith("/themes")) return json([{ id: 39, name: "Warfare" }, { id: 42, name: "Erotic" }]);
        if (input.endsWith("/genres")) return json([{ id: 14, name: "Sport" }]);
        return json([{ id: 243, name: "heist" }]);
      }),
    );
    expect(await getIgdbVocabulary()).toEqual({ themes: [{ id: 39, name: "Warfare" }], genres: [{ id: 14, name: "Sport" }] });
    expect(await findIgdbKeywords(["heists", 'heist"; fields *'])).toEqual([243]);
    expect(calls.at(-1)).toEqual({
      url: "https://api.igdb.com/v4/keywords",
      body: 'fields id,name; where name = "heists" | name = "heist; fields *"; limit 10;',
    });
    expect(await findIgdbKeywords([])).toEqual([]);
  });

  it("keeps a game's themes as its tags, and looks up many games' themes at once", async () => {
    expect(normaliseIgdbGame({ id: 1, name: "Game", themes: [{ name: "Warfare" }, { name: "Erotic" }, { name: "Warfare" }] })?.tags).toEqual(["Warfare"]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => (input.startsWith("https://id.twitch.tv/") ? json({ access_token: "token", expires_in: 5_000_000 }) : json(themed))),
    );
    const tags = await getIgdbTags(["1942", "26226", "113112"]);
    expect(tags.get("1942")).toEqual(["Action", "Fantasy", "Open world"]);
    expect(tags.get("113112")).toEqual(["Action", "Fantasy", "Drama"]);
  });
});
