// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signInWithPassword: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
};
const jar = { set: vi.fn(), delete: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("@/lib/site", () => ({ siteUrl: () => "https://marquee.test" }));

const { signInWithPassword, verifyEmailCode } = await import("./auth");

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const entry of [value].flat()) data.append(key, entry);
  }
  return data;
}

const CODE = ["0", "4", "2", "9", "1", "7"];

beforeEach(() => {
  vi.clearAllMocks();
  auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
});

describe("signInWithPassword", () => {
  it("signs in with the captcha token, remembers the method, and hands back where to go", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const result = await signInWithPassword(
      { status: "idle" },
      form({ email: " you@example.com ", password: "popcorn-row-7", next: "/c/anime", captchaToken: "tok" }),
    );

    expect(result).toEqual({ status: "signed-in", next: "/c/anime" });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "you@example.com",
      password: "popcorn-row-7",
      options: { captchaToken: "tok" },
    });
    expect(jar.set).toHaveBeenCalledWith("marquee-sign-in", "password", expect.objectContaining({ httpOnly: true, secure: true }));
  });

  it("gives one answer for a wrong password or an unknown email", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: "invalid_credentials", status: 400 } });
    const result = await signInWithPassword({ status: "idle" }, form({ email: "you@example.com", password: "nope" }));
    expect(result).toMatchObject({ status: "error", message: expect.stringMatching(/^That email and password don't match/) });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("never asks Supabase without both fields", async () => {
    const result = await signInWithPassword({ status: "idle" }, form({ email: "you@example.com", password: "" }));
    expect(result).toEqual({ status: "error", message: "Enter your password." });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("keeps the next hop on this site", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const result = await signInWithPassword(
      { status: "idle" },
      form({ email: "you@example.com", password: "popcorn-row-7", next: "https://evil.example" }),
    );
    expect(result).toEqual({ status: "signed-in", next: "/home" });
  });
});

describe("verifyEmailCode", () => {
  it("signs in with a plain code and forgets the password preference", async () => {
    const result = await verifyEmailCode({ status: "idle" }, form({ email: "you@example.com", code: CODE, next: "/home" }));
    expect(result).toEqual({ status: "verified", next: "/home" });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "you@example.com", token: "042917", type: "email" });
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(jar.delete).toHaveBeenCalledWith("marquee-sign-in");
  });

  it("saves a chosen password once the code has proved the address", async () => {
    const result = await verifyEmailCode(
      { status: "idle" },
      form({ email: "you@example.com", code: CODE, next: "/home", password: "popcorn-row-7" }),
    );
    expect(result).toEqual({ status: "verified", next: "/home" });
    expect(auth.verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(auth.updateUser.mock.invocationCallOrder[0]);
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "popcorn-row-7", nonce: undefined, data: { password_set: true } });
    expect(jar.set).toHaveBeenCalledWith("marquee-sign-in", "password", expect.any(Object));
  });

  it("turns a short password away before spending the code", async () => {
    const result = await verifyEmailCode(
      { status: "idle" },
      form({ email: "you@example.com", code: CODE, password: "short" }),
    );
    expect(result).toEqual({ status: "error", message: "Use at least 8 characters.", attempt: 1 });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("lets them in and points to Settings when the password won't save", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: { code: "weak_password", message: "weak" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await verifyEmailCode(
      { status: "idle" },
      form({ email: "you@example.com", code: CODE, next: "/home", password: "popcorn-row-7" }),
    );
    expect(result).toEqual({ status: "verified", next: "/settings/account?notice=password-not-saved" });
    expect(jar.delete).toHaveBeenCalledWith("marquee-sign-in");
  });

  it("saves nothing when the code is wrong", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: { code: "otp_expired", status: 403 } });
    const result = await verifyEmailCode(
      { status: "idle" },
      form({ email: "you@example.com", code: CODE, password: "popcorn-row-7", sentAt: String(Date.now()) }),
    );
    expect(result).toMatchObject({ status: "error", message: "That code doesn't match. Try again." });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
