import { describe, expect, it } from "vitest";
import { initials } from "./user";

describe("initials", () => {
  it("takes the first two letters of a single name", () => {
    expect(initials("Akuma")).toBe("AK");
    expect(initials("karthikbunnu2oo4")).toBe("KA");
  });

  it("takes the first letter of the first two words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  mary   jane watson ")).toBe("MJ");
  });

  it("keeps multi-byte letters whole", () => {
    expect(initials("Émile Zola")).toBe("ÉZ");
    expect(initials("鈴木")).toBe("鈴木");
  });

  it("falls back when there is no name", () => {
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});
