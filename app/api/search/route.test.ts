// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims } }),
}));

const searchMetadata = vi.fn();
const matchMetadata = vi.fn();
const getAnimeSeries = vi.fn();
vi.mock("@/lib/search", () => ({
  searchMetadata: (...args: unknown[]) => searchMetadata(...args),
  matchMetadata: (...args: unknown[]) => matchMetadata(...args),
  getAnimeSeries: (...args: unknown[]) => getAnimeSeries(...args),
}));

const { GET, POST } = await import("./route");

const call = (query: string) => GET(new NextRequest(`http://localhost:3000/api/search?${query}`));
const signIn = (sub: string) => getClaims.mockResolvedValue({ data: { claims: { sub } } });

describe("GET /api/search", () => {
  beforeEach(() => {
    getClaims.mockReset();
    searchMetadata.mockReset();
  });

  it("needs a session", async () => {
    getClaims.mockResolvedValue({ data: null });
    const response = await call("kind=anime&q=frieren");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ results: [], error: "signed_out" });
    expect(searchMetadata).not.toHaveBeenCalled();
  });

  it("rejects custom shelves, one-letter queries and missing params", async () => {
    signIn("user-validate");
    for (const query of ["kind=custom&q=frieren", "kind=anime&q=f", "kind=anime&q=%20%20a%20", "q=frieren", ""]) {
      const response = await call(query);
      expect(response.status, query).toBe(400);
    }
    expect(searchMetadata).not.toHaveBeenCalled();
  });

  it("returns normalised results with a short private browser cache", async () => {
    signIn("user-results");
    searchMetadata.mockResolvedValue({ results: [{ source: "anilist", externalId: "154587", title: "Frieren" }] });
    const response = await call("kind=anime&q=%20frieren%20");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=300");
    expect((await response.json()).results[0].title).toBe("Frieren");
    expect(searchMetadata).toHaveBeenCalledWith("anime", "frieren");
  });

  it("passes provider trouble through as a 200 with a flag that isn't cached", async () => {
    signIn("user-trouble");
    searchMetadata.mockResolvedValue({ results: [], error: "unavailable" });
    const response = await call("kind=movie&q=dune");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ results: [], error: "unavailable" });
  });

  it("slows down one user without affecting another", async () => {
    signIn("user-greedy");
    searchMetadata.mockResolvedValue({ results: [] });
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) statuses.push((await call(`kind=anime&q=query${i}`)).status);
    expect(statuses.slice(0, 30).every((status) => status === 200)).toBe(true);
    expect(statuses[30]).toBe(429);

    signIn("user-patient");
    expect((await call("kind=anime&q=frieren")).status).toBe(200);
  });
});

describe("POST /api/search (Find covers)", () => {
  const post = (body: unknown) =>
    POST(new NextRequest("http://localhost:3000/api/search", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));

  beforeEach(() => {
    getClaims.mockReset();
    matchMetadata.mockReset();
  });

  it("needs a session and a sensible batch", async () => {
    getClaims.mockResolvedValue({ data: null });
    expect((await post({ kind: "anime", queries: ["Naruto"] })).status).toBe(401);

    signIn("user-batch");
    for (const bad of [{ kind: "anime", queries: [] }, { kind: "custom", queries: ["x"] }, { kind: "anime", queries: Array(11).fill("x") }, "nope"]) {
      expect((await post(bad)).status).toBe(400);
    }
    expect(matchMetadata).not.toHaveBeenCalled();
  });

  it("returns candidates for each title, never cached", async () => {
    signIn("user-batch-ok");
    matchMetadata.mockResolvedValue({ results: [[{ source: "anilist", externalId: "20", title: "Naruto" }], []] });
    const response = await post({ kind: "anime", queries: [" Naruto ", "Nothing"] });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).results[0][0].title).toBe("Naruto");
    expect(matchMetadata).toHaveBeenCalledWith("anime", ["Naruto", "Nothing"]);
  });
});

describe("GET /api/search?related= (the rest of a series)", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getAnimeSeries.mockReset();
  });

  it("is for anime with an AniList id, signed in", async () => {
    getClaims.mockResolvedValue({ data: null });
    expect((await call("kind=anime&related=113415")).status).toBe(401);

    signIn("user-series");
    for (const query of ["kind=movie&related=113415", "kind=anime&related=abc", "kind=anime&related="]) {
      expect((await call(query)).status, query).toBe(400);
    }
    expect(getAnimeSeries).not.toHaveBeenCalled();

    getAnimeSeries.mockResolvedValue({ results: [{ source: "anilist", externalId: "145064", title: "Jujutsu Kaisen Season 2", release: "out" }] });
    const response = await call("kind=anime&related=113415");
    expect(response.status).toBe(200);
    expect((await response.json()).results[0].title).toBe("Jujutsu Kaisen Season 2");
    expect(getAnimeSeries).toHaveBeenCalledWith("113415");
  });
});
