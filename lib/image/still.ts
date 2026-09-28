/**
 * The right `sizes` for a title's still (backdrop) drawn with object-cover.
 *
 * TMDB stills are 16:9, so a box's own width is what gets drawn. AniList's
 * banners are wide strips (1900 x 400): filling a box's height makes them far
 * wider than the box, and asking for the box's width fetched an image that
 * then got stretched about twice over and went soft. For a banner, ask for
 * the width it's actually drawn at; the optimiser never serves more than the
 * original has.
 */
const BANNER_ASPECT = 1900 / 400;

export function isBanner(url: string): boolean {
  return url.includes("anilistcdn/media/") && url.includes("/banner/");
}

/** `boxSizes` for an ordinary still; a banner's drawn width for a box `boxHeight` px tall. */
export function stillSizes(url: string, boxHeight: number, boxSizes: string): string {
  return isBanner(url) ? `${Math.ceil(boxHeight * BANNER_ASPECT)}px` : boxSizes;
}
