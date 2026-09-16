/**
 * Film grain over the whole app (SPEC §9.3). A tiled noise texture blended
 * soft-light, so it textures without hazing. Sits above content and menus.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="grain pointer-events-none fixed inset-0 z-[60] opacity-[0.07] mix-blend-soft-light"
    />
  );
}
