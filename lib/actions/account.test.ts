// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

let signedIn = true;
const auth = {
  getClaims: vi.fn(async () => ({ data: signedIn ? { claims: { sub: "user-1" } } : null })),
  updateUser: vi.fn(),
  reauthenticate: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { setPassword } = await import("./account");

beforeEach(() => {
  vi.clearAllMocks();
  signedIn = true;
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
  auth.reauthenticate.mockResolvedValue({ data: {}, error: null });
});

describe("setPassword", () => {
  it("saves a good password and marks that there is one", async () => {
    expect(await setPassword("popcorn-row-7")).toEqual({ ok: true });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "popcorn-row-7", nonce: undefined, data: { password_set: true } });
  });

  it("checks the password before asking Supabase", async () => {
    expect(await setPassword("short")).toEqual({ ok: false, message: "Use at least 8 characters." });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("needs a session", async () => {
    signedIn = false;
    expect(await setPassword("popcorn-row-7")).toEqual({ ok: false, message: "Your session ended. Sign in again." });
  });

  it("emails a code when Supabase wants proof, then saves with it", async () => {
    auth.updateUser.mockResolvedValueOnce({ data: {}, error: { code: "reauthentication_needed" } });
    expect(await setPassword("popcorn-row-7")).toEqual({ ok: false, confirm: true });
    expect(auth.reauthenticate).toHaveBeenCalledOnce();

    expect(await setPassword("popcorn-row-7", "042917")).toEqual({ ok: true });
    expect(auth.updateUser).toHaveBeenLastCalledWith({ password: "popcorn-row-7", nonce: "042917", data: { password_set: true } });
  });

  it("keeps the code step open for a wrong code", async () => {
    auth.updateUser.mockResolvedValueOnce({ data: {}, error: { code: "reauthentication_not_valid" } });
    expect(await setPassword("popcorn-row-7", "000000")).toEqual({
      ok: false,
      confirm: true,
      message: "That code doesn't match. Try again.",
    });
    expect(auth.reauthenticate).not.toHaveBeenCalled();
  });

  it("wants all six digits", async () => {
    expect(await setPassword("popcorn-row-7", "123")).toEqual({ ok: false, confirm: true, message: "Enter all 6 digits." });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
