// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

let claims: { sub: string } | null = { sub: "user-1" };
let rows: unknown[] | null = [];
const order = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: claims ? { claims } : null }) },
    from: () => ({
      select: () => ({
        order: (...args: unknown[]) => {
          order(...args);
          return Promise.resolve(rows ? { data: rows, error: null } : { data: null, error: { message: "boom" } });
        },
      }),
    }),
  }),
}));

const { GET } = await import("./route");

describe("GET /api/titles", () => {
  beforeEach(() => {
    claims = { sub: "user-1" };
    rows = [];
    order.mockReset();
  });

  it("needs a session", async () => {
    claims = null;
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ titles: [] });
  });

  it("returns the viewer's titles, most recently touched first, never cached", async () => {
    rows = [{ id: "t1", title: "Frieren" }];
    const response = await GET();
    expect(await response.json()).toEqual({ titles: rows });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(order).toHaveBeenCalledWith("updated_at", { ascending: false });
  });

  it("fails softly", async () => {
    rows = null;
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ titles: [] });
  });
});
