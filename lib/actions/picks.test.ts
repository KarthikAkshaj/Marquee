// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

let signedIn = true;
let failure: { message: string } | null = null;
const calls: { table: string; op: string; value?: unknown; options?: unknown; filters: [string, unknown][] }[] = [];

function table(name: string) {
  const entry = { table: name, op: "", value: undefined as unknown, options: undefined as unknown, filters: [] as [string, unknown][] };
  const builder = {
    upsert: (value: unknown, options: unknown) => (Object.assign(entry, { op: "upsert", value, options }), calls.push(entry), builder),
    delete: () => ((entry.op = "delete"), calls.push(entry), builder),
    eq: (column: string, value: unknown) => (entry.filters.push([column, value]), builder),
    then: (resolve: (value: { error: typeof failure }) => unknown) => resolve({ error: failure }),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: signedIn ? { claims: { sub: "user-1" } } : null }) },
    from: table,
  }),
}));

const { dismissPick, restorePick } = await import("./picks");

beforeEach(() => {
  calls.length = 0;
  signedIn = true;
  failure = null;
});

describe("dismissPick", () => {
  it("remembers the title for the viewer, and saying it twice is fine", async () => {
    expect(await dismissPick({ source: "anilist", externalId: "21827" })).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        table: "dismissed_picks",
        op: "upsert",
        value: { user_id: "user-1", source: "anilist", external_id: "21827" },
        options: { ignoreDuplicates: true },
        filters: [],
      },
    ]);
  });

  it("needs a session and a real provider id", async () => {
    expect(await dismissPick({ source: "manual", externalId: "1" } as never)).toMatchObject({ ok: false });
    expect(await dismissPick({ source: "tmdb", externalId: "1; drop" })).toMatchObject({ ok: false });
    signedIn = false;
    expect(await dismissPick({ source: "tmdb", externalId: "1" })).toEqual({ ok: false, message: "Your session ended. Sign in again." });
    expect(calls).toHaveLength(0);
  });

  it("says so when the save fails", async () => {
    failure = { message: "boom" };
    expect(await dismissPick({ source: "igdb", externalId: "1942" })).toEqual({ ok: false, message: "Couldn't save that. Try again." });
  });
});

describe("restorePick", () => {
  it("forgets exactly that title, for the viewer only", async () => {
    expect(await restorePick({ source: "tmdb", externalId: "693134" })).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        table: "dismissed_picks",
        op: "delete",
        value: undefined,
        options: undefined,
        filters: [
          ["user_id", "user-1"],
          ["source", "tmdb"],
          ["external_id", "693134"],
        ],
      },
    ]);
  });

  it("needs a session", async () => {
    signedIn = false;
    expect(await restorePick({ source: "tmdb", externalId: "1" })).toMatchObject({ ok: false });
    expect(calls).toHaveLength(0);
  });
});
