/**
 * The light in the room (SPEC §9.3). `app` is the populated screen: amber from
 * the upper left, a warm red from the right. `empty` is the lights-down state:
 * one faint amber pool where the marquee sign stands.
 * Vignettes sit behind content: they darken the room, never the text
 * (over content they pushed sidebar text below WCAG AA contrast).
 */
export function AmbientBackground({ variant }: { variant: "app" | "empty" }) {
  if (variant === "empty") {
    return (
      <div aria-hidden className="pointer-events-none">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="glow-amber-soft absolute top-30 left-160 h-130 w-175 blur-[70px] max-md:left-1/2 max-md:w-105 max-md:-translate-x-1/2" />
        </div>
        <div className="vignette-empty fixed inset-0 -z-10" />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="glow-amber absolute -top-55 left-45 h-115 w-155 blur-[60px] max-md:-top-45 max-md:left-5 max-md:h-90 max-md:w-105 max-md:blur-[50px]" />
        <div className="glow-crimson absolute -top-40 -right-15 h-105 w-130 blur-[70px] max-md:-top-30 max-md:-right-35 max-md:h-80 max-md:w-90 max-md:blur-[60px]" />
      </div>
      <div className="vignette-app fixed inset-0 -z-10" />
    </div>
  );
}
