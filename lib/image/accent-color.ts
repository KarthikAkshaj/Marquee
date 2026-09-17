import { FastAverageColor } from "fast-average-color";

/** Near-black and near-white say nothing about a poster; skip them. */
const IGNORED: [number, number, number, number, number][] = [
  [0, 0, 0, 255, 48],
  [255, 255, 255, 255, 48],
];

/**
 * A cover's dominant colour as "#rrggbb", for the glow behind it (SPEC §3).
 * Read through Next's image optimiser: same origin, so the canvas isn't
 * tainted, and a 64px thumbnail is plenty. Null when it can't be read.
 */
export async function accentFromCover(coverUrl: string): Promise<string | null> {
  const fac = new FastAverageColor();
  try {
    const thumbnail = `/_next/image?url=${encodeURIComponent(coverUrl)}&w=64&q=75`;
    const color = await fac.getColorAsync(thumbnail, { algorithm: "dominant", ignoredColor: IGNORED, silent: true });
    return color.error ? null : color.hex.slice(0, 7);
  } catch {
    return null;
  } finally {
    fac.destroy();
  }
}
