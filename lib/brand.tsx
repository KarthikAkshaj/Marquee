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

type IconArt = {
  /** Width and height in pixels. */
  size: number;
  /** The bulb's size as a share of the icon. Maskable icons keep it inside the central safe circle. */
  bulb: number;
  /** A transparent background: the favicon sits on the browser's own tab colour. */
  transparent?: boolean;
};

/**
 * The app icon for `ImageResponse` (Satori, so inline styles only): the amber
 * bulb from the logo, glowing on the dark stage.
 */
export function iconArt({ size, bulb, transparent = false }: IconArt) {
  const side = Math.round(size * bulb);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: transparent ? "transparent" : `radial-gradient(circle at 50% 50%, rgba(244, 182, 80, 0.2), ${BRAND.ink} 62%)`,
      }}
    >
      <div
        style={{
          width: side,
          height: side,
          borderRadius: Math.round(side * 0.26),
          background: BRAND.bulb,
          boxShadow: transparent ? "none" : `0 0 ${Math.round(size * 0.12)}px rgba(244, 182, 80, 0.55)`,
        }}
      />
    </div>
  );
}
