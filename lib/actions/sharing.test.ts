// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

let signedIn = true;
const updates: { table: string; patch: Record<string, unknown>; filters: [string, unknown][] }[] = [];
let matched = 1;
let failure: { message: string } | null = null;

function table(name: string) {
  const entry = { table: name, patch: {} as Record<string, unknown>, filters: [] as [string, unknown][] };
  const builder = {
    update: (patch: Record<string, unknown>) => ((entry.patch = patch), updates.push(entry), builder),
    eq: (column: string, value: unknown) => (entry.filters.push([column, value]), builder),
    select: async () => ({ data: failure ? null : Array.from({ length: matched }, (_, i) => ({ id: `row-${i}` })), error: failure }),
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
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { setProfilePublic, setShelfPublic } = await import("./profile");

const SHELF = "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d";

beforeEach(() => {
  updates.length = 0;
  signedIn = true;
  matched = 1;
  failure = null;
});

describe("setProfilePublic", () => {
  it("flips the viewer's own profile", async () => {
    expect(await setProfilePublic(true)).toEqual({ ok: true });
    expect(updates).toEqual([{ table: "profiles", patch: { is_public: true }, filters: [["id", "user-1"]] }]);
  });

  it("needs a session and a real boolean", async () => {
    expect(await setProfilePublic("yes" as never)).toMatchObject({ ok: false });
    signedIn = false;
    expect(await setProfilePublic(false)).toEqual({ ok: false, message: "Your session ended. Sign in again." });
    expect(updates).toHaveLength(0);
  });
});

describe("setShelfPublic", () => {
  it("flips one of the viewer's own shelves", async () => {
    expect(await setShelfPublic(SHELF, true)).toEqual({ ok: true });
    expect(updates[0]).toEqual({ table: "categories", patch: { is_public: true }, filters: [["id", SHELF], ["user_id", "user-1"]] });
  });

  it("says so when the shelf isn't theirs, or isn't there", async () => {
    matched = 0;
    expect(await setShelfPublic(SHELF, true)).toEqual({ ok: false, message: "Couldn't change that. Try again." });
  });

  it("turns away an id that isn't one", async () => {
    expect(await setShelfPublic("anime", true)).toMatchObject({ ok: false });
    expect(updates).toHaveLength(0);
  });
});
