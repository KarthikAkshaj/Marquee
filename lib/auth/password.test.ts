import { describe, expect, it, vi } from "vitest";
import { hasPassword, passwordStrength, savePasswordErrorMessage, signInErrorMessage } from "./password";
import { savePassword } from "./save-password";

describe("passwordStrength", () => {
  it("counts down to the minimum", () => {
    expect(passwordStrength("")).toEqual({ score: 0, label: "8 or more characters" });
    expect(passwordStrength("abcde")).toEqual({ score: 0, label: "3 more to go" });
  });

  it("calls the obvious ones weak however long", () => {
    for (const password of ["password123", "12345678", "abcdefghij", "aaaaaaaaaaaa", "qwertyuiop!"]) {
      expect(passwordStrength(password).score, password).toBe(1);
    }
  });

  it("rates length above variety", () => {
    expect(passwordStrength("sunlit8x").score).toBe(1);
    expect(passwordStrength("sunlit-8x").score).toBe(2);
    expect(passwordStrength("popcornrowseven").score).toBe(3);
    expect(passwordStrength("Popcorn-Row7").score).toBe(3);
  });

  it("counts characters, not bytes", () => {
    expect(passwordStrength("ñandú").label).toBe("3 more to go");
  });
});

describe("signInErrorMessage", () => {
  it("gives a wrong password and an unknown email one answer", () => {
    expect(signInErrorMessage({ code: "invalid_credentials", status: 400 })).toMatch(/^That email and password don't match\./);
  });

  it("slows people down in words", () => {
    expect(signInErrorMessage({ status: 429 })).toBe("Too many tries. Give it a minute, then try again.");
  });

  it("names the robot check instead of Supabase's wording", () => {
    expect(signInErrorMessage({ message: "captcha protection: request disallowed (timeout-or-duplicate)" })).toMatch(/robot check/);
  });
});

describe("savePasswordErrorMessage", () => {
  it("reads the codes Settings can hit", () => {
    expect(savePasswordErrorMessage({ code: "weak_password" })).toMatch(/at least 8/);
    expect(savePasswordErrorMessage({ code: "reauthentication_not_valid" })).toBe("That code doesn't match. Try again.");
    expect(savePasswordErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(/Too many/);
  });
});

describe("hasPassword", () => {
  it("only trusts the flag the app sets", () => {
    expect(hasPassword({ password_set: true })).toBe(true);
    expect(hasPassword({ password_set: "yes" })).toBe(false);
    expect(hasPassword(undefined)).toBe(false);
  });
});

describe("savePassword", () => {
  it("saves the password and marks it in one call", async () => {
    const updateUser = vi.fn(async () => ({ data: {}, error: null }));
    expect(await savePassword({ auth: { updateUser } } as never, "popcorn-row-7")).toBeNull();
    expect(updateUser).toHaveBeenCalledWith({ password: "popcorn-row-7", nonce: undefined, data: { password_set: true } });
  });

  it("counts the password they already have as saved", async () => {
    const updateUser = vi
      .fn()
      .mockResolvedValueOnce({ data: {}, error: { code: "same_password" } })
      .mockResolvedValueOnce({ data: {}, error: null });
    expect(await savePassword({ auth: { updateUser } } as never, "popcorn-row-7")).toBeNull();
    expect(updateUser).toHaveBeenLastCalledWith({ data: { password_set: true } });
  });

  it("passes other failures back", async () => {
    const updateUser = vi.fn(async () => ({ data: {}, error: { code: "reauthentication_needed" } }));
    expect(await savePassword({ auth: { updateUser } } as never, "popcorn-row-7")).toEqual({ code: "reauthentication_needed" });
  });
});
