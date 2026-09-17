// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import hades from "./__fixtures__/igdb-hades.json";
import { igdbConfigured, igdbSearchBody, resetIgdbToken, searchIgdb } from "./igdb";

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
});
