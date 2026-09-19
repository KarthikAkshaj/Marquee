/**
 * Marquee's colours and mark outside the page's CSS, where Tailwind tokens
 * can't reach: the web app manifest and the generated app icons. Values match
 * `--color-bg` and `--color-accent` in globals.css.
 */
export const BRAND = {
  name: "Marquee",
  description: "Everything you've watched, are watching, and swear you'll get to.",
  ink: "#09090B",
  bulb: "#F4B650",
} as const;

/**
 * The icon's M: Bricolage Grotesque SemiBold's capital (SIL Open Font License)
 * with its middle point lifted off the baseline. Baked as a path so the icons
 * never depend on a font loading.
 */
export const MARK = {
  width: 704,
  height: 660,
  path: "M0 660L0 0L193 0L357 420L359 420L520 0L704 0L704 660L585 660L585 128L583 128L411 565L292 565L121 128L119 128L119 660Z",
} as const;

type IconArt = {
  /** Width and height in pixels. */
  size: number;
  /** The M's height as a share of the icon. Maskable icons keep it inside the central safe circle. */
  mark: number;
  /** Corner radius as a share of the icon: 0 where the platform rounds or crops it (iOS, maskable). */
  radius: number;
};

/**
 * The app icon for `ImageResponse` (Satori, so inline styles only): the dark M
 * on the amber tile, the same amber as the bulb beside the wordmark.
 */
export function iconArt({ size, mark, radius }: IconArt) {
  const height = Math.round(size * mark);
  const width = Math.round((height * MARK.width) / MARK.height);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.bulb,
        borderRadius: Math.round(size * radius),
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${MARK.width} ${MARK.height}`}>
        <path d={MARK.path} fill={BRAND.ink} />
      </svg>
    </div>
  );
}
