// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims } }),
}));

const context = { offered: [] };
const loadPickContext = vi.fn(async () => context);
const moodPicksFor = vi.fn(async () => ({ picks: [], notices: { a: "mood" } }));
const recommendedPicks = vi.fn(async () => ({ picks: [], notices: { a: "usual" } }));
vi.mock("@/lib/picks", () => ({
  loadPickContext: () => loadPickContext(),
  moodPicksFor: (...args: unknown[]) => moodPicksFor(...(args as [])),
  recommendedPicks: (...args: unknown[]) => recommendedPicks(...(args as [])),
}));

const { GET } = await import("./route");

const call = (query: string) => GET(new NextRequest(`http://localhost:3000/api/picks?${query}`));
const signIn = (sub: string) => getClaims.mockResolvedValue({ data: { claims: { sub } } });

describe("GET /api/picks", () => {
  beforeEach(() => {
    getClaims.mockReset();
    vi.clearAllMocks();
  });

  it("needs a session", async () => {
    getClaims.mockResolvedValue({ data: null });
    const response = await call("mood=war");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ picks: [], notices: {}, error: "signed_out" });
    expect(loadPickContext).not.toHaveBeenCalled();
  });

  it("answers a mood, a word that means one, or a word of its own", async () => {
    signIn("user-moods");
    const response = await call("mood=military");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ picks: [], notices: { a: "mood" } });
    expect(moodPicksFor).toHaveBeenCalledWith(context, expect.objectContaining({ mood: expect.objectContaining({ slug: "war" }) }));

    await call("mood=Heist");
    expect(moodPicksFor).toHaveBeenLastCalledWith(context, { mood: null, word: "heist" });
  });

  it("gives the usual picks without a mood", async () => {
    signIn("user-usual");
    for (const query of ["", "mood="]) {
      expect(await (await call(query)).json()).toEqual({ picks: [], notices: { a: "usual" } });
    }
    expect(moodPicksFor).not.toHaveBeenCalled();
  });

  it("turns away a mood that isn't a word", async () => {
    signIn("user-invalid");
    for (const query of ["mood=a", `mood=${"x".repeat(41)}`, "mood=%3Cscript%3E"]) {
      const response = await call(query);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("invalid_mood");
    }
    expect(loadPickContext).not.toHaveBeenCalled();
  });

  it("slows down one viewer tapping through moods too fast", async () => {
    signIn("user-burst");
    const statuses = [];
    for (let index = 0; index < 22; index += 1) statuses.push((await call("mood=war")).status);
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
