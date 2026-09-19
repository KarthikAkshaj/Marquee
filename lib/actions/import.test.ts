// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportBatch } from "@/lib/validators";

let signedIn = true;
let rpcResult: { data: number | null; error: { message: string } | null } = { data: 2, error: null };
const rpc = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: signedIn ? { claims: { sub: "user-1" } } : null }) },
    rpc: async (...args: unknown[]) => {
      rpc(...args);
      return rpcResult;
    },
  }),
}));

const { importTitles } = await import("./import");

const batch = (overrides: Partial<ImportBatch> = {}): ImportBatch => ({
  categoryId: "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d",
  startedAt: "2026-09-19T10:00:00.000Z",
  titles: [
    { title: "Pluto", status: "planned", year: null, position: 0 },
    { title: "Perfect Blue", status: "completed", year: 1997, position: 1 },
  ],
  ...overrides,
});

describe("importTitles", () => {
  beforeEach(() => {
    signedIn = true;
    rpcResult = { data: 2, error: null };
    rpc.mockReset();
  });

  it("sends the batch to import_titles and reports how many landed", async () => {
    expect(await importTitles(batch())).toEqual({ ok: true, added: 2 });
    expect(rpc).toHaveBeenCalledWith("import_titles", {
      target_category: "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d",
      titles: batch().titles,
      batch_started: "2026-09-19T10:00:00.000Z",
    });
  });

  it("refuses empty, oversized or malformed batches without calling the database", async () => {
    const many = Array.from({ length: 101 }, (_, position) => ({ title: `T${position}`, status: "planned" as const, year: null, position }));
    for (const bad of [batch({ titles: [] }), batch({ titles: many }), batch({ titles: [{ title: " ", status: "planned", year: null, position: 0 }] })]) {
      expect(await importTitles(bad)).toMatchObject({ ok: false });
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains an ended session and a failed save", async () => {
    signedIn = false;
    expect(await importTitles(batch())).toEqual({ ok: false, message: "Your session ended. Sign in again." });
    signedIn = true;
    rpcResult = { data: null, error: { message: "boom" } };
    expect(await importTitles(batch())).toEqual({ ok: false, message: "Couldn't import those titles. Try again." });
  });
});
