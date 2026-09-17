// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims } }),
}));

const searchMetadata = vi.fn();
vi.mock("@/lib/search", () => ({ searchMetadata: (...args: unknown[]) => searchMetadata(...args) }));

const { GET } = await import("./route");

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
