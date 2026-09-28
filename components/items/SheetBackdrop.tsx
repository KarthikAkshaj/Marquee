"use client";

import Image from "next/image";
import { useState } from "react";
import { stillSizes } from "@/lib/image/still";
import { cn } from "@/lib/utils";

type SheetBackdropProps = {
  backdropUrl: string | null;
  /** The title's own colour as a background: what shows while the still loads, and all there is without one. */
  wash: string;
};

/**
 * The band across the top of the title sheet (U13): the title's still, sharp,
 * the way a film's page shows it, settling in with a slow push once it has
 * loaded. Gradients keep the title and the close button readable over it.
 */
export function SheetBackdrop({ backdropUrl, wash }: SheetBackdropProps) {
  const [loaded, setLoaded] = useState<string | null>(null);
  const shown = backdropUrl !== null && loaded === backdropUrl;

  return (
    <div aria-hidden className="absolute inset-x-0 top-0 h-57.5 overflow-hidden md:h-60">
      <div className="absolute inset-0" style={{ background: wash }} />
      {backdropUrl && (
        <Image
          src={backdropUrl}
          alt=""
          fill
          // The band is 240px tall; a banner drawn that tall is far wider than the sheet.
          sizes={stillSizes(backdropUrl, 240, "(min-width: 768px) 560px, 100vw")}
          onLoad={() => setLoaded(backdropUrl)}
          className={cn(
            "object-cover object-[center_30%] opacity-0 transition-opacity duration-300",
            // Dimmer on phones, where the title and its details sit right on top of it.
            shown && "animate-settle opacity-45 lite:animate-none md:opacity-80",
          )}
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-sheet via-sheet/75 to-sheet/30 md:via-sheet/55 md:to-sheet/5" />
      <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-sheet/60 to-transparent" />
    </div>
  );
}
