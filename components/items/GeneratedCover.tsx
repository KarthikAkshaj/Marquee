import { generatedCover } from "@/lib/poster-art";

/**
 * Art for titles without a cover (SPEC §8.5): the category's colour, grain and
 * a soft highlight. Never the title text, and never a gray box.
 * Fills its positioned parent.
 */
export function GeneratedCover({ itemId, categoryColor }: { itemId: string; categoryColor: string }) {
  const cover = generatedCover(itemId, categoryColor);
  return (
    <div aria-hidden className="absolute inset-0" style={{ background: cover.background }}>
      <div className="grain-fine absolute inset-0 opacity-9 mix-blend-soft-light" />
      <div className="absolute inset-0" style={{ background: cover.sheen }} />
    </div>
  );
}
