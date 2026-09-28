import { describe, expect, it } from "vitest";
import { isBanner, stillSizes } from "./still";

const banner = "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg";
const still = "https://image.tmdb.org/t/p/w1280/abc.jpg";

describe("stillSizes", () => {
  it("tells AniList's banners from ordinary stills", () => {
    expect(isBanner(banner)).toBe(true);
    expect(isBanner(still)).toBe(false);
    expect(isBanner("https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/x.jpg")).toBe(false);
  });

  it("asks for a banner at the width it's drawn, and a still at the box's", () => {
    expect(stillSizes(banner, 240, "560px")).toBe("1140px");
    expect(stillSizes(still, 240, "560px")).toBe("560px");
  });
});
