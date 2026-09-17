import { describe, expect, it } from "vitest";
import {
  createItemSchema,
  emailSchema,
  itemFavoriteSchema,
  itemIdSchema,
  itemStatusSchema,
  otpCodeSchema,
  safeRedirectPath,
} from "./validators";

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

describe("createItemSchema", () => {
  const base = {
    categoryId: "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11",
    title: "  Frieren  ",
    year: "",
    status: "planned",
    progressTotal: "",
  };

  it("trims the title and treats empty optional fields as missing", () => {
    const parsed = createItemSchema.parse(base);
    expect(parsed.title).toBe("Frieren");
    expect(parsed.year).toBeUndefined();
    expect(parsed.progressTotal).toBeUndefined();
  });

  it("coerces numbers from form strings", () => {
    const parsed = createItemSchema.parse({ ...base, year: "2023", progressTotal: "28" });
    expect(parsed.year).toBe(2023);
    expect(parsed.progressTotal).toBe(28);
  });

  it("rejects bad input with a readable message", () => {
    const result = createItemSchema.safeParse({ ...base, title: "   ", year: "20x3", status: "watching" });
    expect(result.success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, year: "1500" }).success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, progressTotal: "0" }).success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, categoryId: "anime" }).success).toBe(false);
  });
});

describe("quick action schemas", () => {
  const id = "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";

  it("accepts a real id with a known status or a favourite flag", () => {
    expect(itemStatusSchema.safeParse({ id, status: "dropped" }).success).toBe(true);
    expect(itemFavoriteSchema.safeParse({ id, favorite: false }).success).toBe(true);
    expect(itemIdSchema.safeParse(id).success).toBe(true);
  });

  it("rejects made-up statuses, loose flags and non-ids", () => {
    expect(itemStatusSchema.safeParse({ id, status: "watching" }).success).toBe(false);
    expect(itemFavoriteSchema.safeParse({ id, favorite: "true" }).success).toBe(false);
    expect(itemIdSchema.safeParse("frieren").success).toBe(false);
  });
});
