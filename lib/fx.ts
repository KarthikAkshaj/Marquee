/**
 * How much visual effect a device gets (UI upgrade U9). "full" is the whole
 * show; "lite" keeps the look but drops what costs frames: pointer tilts,
 * flying posters, scroll reveals, slow zooms.
 *
 * Set as `data-fx` on <html> by EffectsTier, read in CSS through the `lite:`
 * variant and in scripts through useFxTier.
 */
export type FxTier = "full" | "lite";

export type FxSignals = {
  reducedMotion: boolean;
  reducedTransparency: boolean;
  /** The browser's data saver. */
  saveData: boolean;
  /** Gigabytes, as Chrome reports it (capped at 8). Other browsers don't say. */
  deviceMemory?: number;
  cores?: number;
};

/**
 * Lite for anyone who asked for less (motion, transparency, data), and for
 * devices that report little memory or very few cores. Safari reports neither
 * honestly (it rounds cores down for privacy), so an unknown never counts
 * against a device: an iPhone gets the full show.
 */
export function fxTier(signals: FxSignals): FxTier {
  if (signals.reducedMotion || signals.reducedTransparency || signals.saveData) return "lite";
  if (signals.deviceMemory !== undefined && signals.deviceMemory <= 4) return "lite";
  if (signals.cores !== undefined && signals.cores <= 2) return "lite";
  return "full";
}

export const FX_QUERIES = ["(prefers-reduced-motion: reduce)", "(prefers-reduced-transparency: reduce)"] as const;

type NavigatorHints = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Whether a media query matches, false where there are no media queries (test DOMs). */
const matches = (query: string) => window.matchMedia?.(query).matches ?? false;

/** What this browser says about itself. Browser only. */
export function readFxSignals(): FxSignals {
  const hints = navigator as NavigatorHints;
  return {
    reducedMotion: matches(FX_QUERIES[0]),
    reducedTransparency: matches(FX_QUERIES[1]),
    saveData: hints.connection?.saveData === true,
    deviceMemory: hints.deviceMemory,
    cores: hints.hardwareConcurrency || undefined,
  };
}
