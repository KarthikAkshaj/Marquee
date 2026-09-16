import { describe, expect, it } from "vitest";
import { emailSchema, otpCodeSchema, safeRedirectPath } from "./validators";

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/c/anime")).toBe("/c/anime");
    expect(safeRedirectPath("/home?item=1")).toBe("/home?item=1");
  });

  it("falls back when missing", () => {
    expect(safeRedirectPath(null)).toBe("/home");
    expect(safeRedirectPath("")).toBe("/home");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/home");
    expect(safeRedirectPath("//evil.example")).toBe("/home");
    expect(safeRedirectPath("evil.example")).toBe("/home");
  });

  it("rejects backslash tricks that browsers read as //", () => {
    // Built from a char code so no layer of escaping can quietly eat it.
    const backslash = String.fromCharCode(92);
    expect(safeRedirectPath(`/${backslash}evil.example`)).toBe("/home");
    expect(safeRedirectPath(`/${backslash}${backslash}evil.example`)).toBe("/home");
  });
});

describe("emailSchema", () => {
  it("accepts and trims a real address", () => {
    expect(emailSchema.parse("  you@example.com ")).toBe("you@example.com");
  });

  it("rejects junk", () => {
    expect(emailSchema.safeParse("nope").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("otpCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpCodeSchema.safeParse("042917").success).toBe(true);
  });

  it("rejects short, long or non-numeric codes", () => {
    for (const code of ["12345", "1234567", "12a456", " 123456", ""]) {
      expect(otpCodeSchema.safeParse(code).success).toBe(false);
    }
  });
});
