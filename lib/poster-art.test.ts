import { describe, expect, it } from "vitest";
import { POSTER_GRADIENTS, generatedCover, posterGradient, posterWallRow } from "./poster-art";

describe("poster art", () => {
  it("keeps the design's default gradients", () => {
    expect(posterGradient("crimson")).toBe("linear-gradient(160deg,#7A1720,#35111A 55%,#120C10)");
    expect(POSTER_GRADIENTS).toHaveLength(8);
  });

  it("rotates wall rows", () => {
    expect(posterWallRow(3)[0]).toBe(POSTER_GRADIENTS[3]);
    expect(posterWallRow(5)).toHaveLength(8);
  });
});

describe("generatedCover", () => {
  it("is stable for the same item, so server and client agree", () => {
    expect(generatedCover("item-1", "crimson")).toEqual(generatedCover("item-1", "crimson"));
  });

  it("varies between items in the same category", () => {
    const covers = new Set(["a", "b", "c", "d", "e"].map((id) => generatedCover(id, "violet").background));
    expect(covers.size).toBeGreaterThan(1);
  });

  it("uses the category's colour family", () => {
    expect(generatedCover("x", "teal").background).toContain("#0F4A45");
    expect(generatedCover("x", "sky").background).toContain("#22314F");
  });

  it("falls back to amber for an unknown colour", () => {
    expect(generatedCover("x", "chartreuse").background).toContain("#6A4113");
  });
});
