"use client";

import { getImageProps } from "next/image";
import type { Item } from "@/lib/items";
import { cn } from "@/lib/utils";

type SpotlightArtProps = {
  item: Pick<Item, "backdrop_url" | "cover_url">;
  /** The title's colour as a background: under the art while it loads, and all there is without any. */
  wash: string;
};

const WIDE = "(min-width: 1280px) calc(100vw - 248px), 100vw";

/**
 * The spotlight's picture (U10). Streaming apps frame the same title two ways:
 * the landscape still across a wide screen, the portrait key art on a phone.
 * One <picture> does both, so a phone never downloads the still, and it's the
 * first image the page asks for and the first it paints. With only a cover, a
 * wide screen shows it on the right, fading into the words.
 */
export function SpotlightArt({ item, wash }: SpotlightArtProps) {
  const wide = item.backdrop_url;
  const tall = item.cover_url ?? item.backdrop_url;
  const coverOnly = !wide && tall !== null;

  let picture = null;
  if (tall) {
    const common = { alt: "", fill: true, fetchPriority: "high", loading: "eager" } as const;
    const { props: art } = getImageProps({ ...common, src: tall, sizes: coverOnly ? "(min-width: 768px) 55vw, 100vw" : "100vw" });
    const still = wide ? getImageProps({ ...common, src: wide, sizes: WIDE }).props : null;
    picture = (
      <picture>
        {still && <source media="(min-width: 768px)" srcSet={still.srcSet} sizes={WIDE} />}
        {/* Shown from the first paint, never waiting on a script: it is what the page counts as loaded.
            Only the slow push moves it, and that is a transform. */}
        <img
          {...art}
          alt=""
          className="animate-push object-cover object-top opacity-75 lite:animate-none md:object-[center_25%] md:opacity-90"
        />
      </picture>
    );
  }

  return (
    <div aria-hidden className="absolute inset-0 -z-1 overflow-hidden">
      <div className="absolute inset-0" style={{ background: wash }} />
      {/* On a phone the art starts below the greeting, fading in from the wash, so the greeting reads clean. */}
      <div
        className={cn(
          "absolute inset-x-0 top-36 bottom-0 mask-[linear-gradient(to_bottom,transparent,black_35%)] md:inset-0 md:mask-none",
          coverOnly && "md:left-auto md:w-[55%] md:mask-[linear-gradient(to_right,transparent,black_45%)]",
        )}
      >
        {picture}
      </div>
      {/* The words sit on the left and the bottom; the greeting on the top. */}
      <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/65 to-bg/10" />
      <div className="absolute inset-0 hidden bg-linear-to-r from-bg/90 via-bg/40 to-transparent md:block" />
      <div className="absolute inset-x-0 top-0 h-2/5 bg-linear-to-b from-bg/80 to-transparent" />
    </div>
  );
}
