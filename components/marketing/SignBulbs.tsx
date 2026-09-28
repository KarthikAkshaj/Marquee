import type { CSSProperties } from "react";

const BULBS = 18;

/**
 * The bottom edge of a marquee sign under the wordmark (U15): a row of bulbs
 * that come on one after another as the page opens, left to right, and stay
 * lit. Only opacity animates, once. Reduced motion shows them lit already.
 */
export function SignBulbs() {
  return (
    // Clear of the q's tail, which drops well below the wordmark's tight line box.
    <div aria-hidden className="mt-7 flex w-full justify-between px-1 md:mt-10">
      {Array.from({ length: BULBS }, (_, index) => (
        <span key={index} className="relative size-1.25 rounded-full bg-accent/15 md:size-1.5">
          <span
            className="absolute inset-0 animate-bulb-on rounded-full bg-accent shadow-bulb-low"
            style={{ animationDelay: `${400 + index * 55}ms` } as CSSProperties}
          />
        </span>
      ))}
    </div>
  );
}
