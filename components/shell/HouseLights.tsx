"use client";

import { createPortal } from "react-dom";

/**
 * The house lights going down (U37): while signing out or switching account,
 * the room dims and closes in to black like the iris at the end of an old
 * film, until the sign-in page comes up. Portalled to the body, so a sheet's
 * transform can't trap it. Lite devices get a plain fade to dark.
 */
export function HouseLights({ down, label }: { down: boolean; label: string }) {
  if (!down) return null;
  return createPortal(
    <div className="house-lights fixed inset-0 z-80">
      <p role="status" className="sr-only">
        {label}
      </p>
    </div>,
    document.body,
  );
}
