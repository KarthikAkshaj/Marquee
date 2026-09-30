"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const BULBS = 15;

/** While "Something new" asks the providers: the reel's bulbs chase over an empty gate, so the wait reads as the spin starting. */
export function SurpriseLoading() {
  return (
    <div aria-busy className="flex min-h-74 flex-col items-center justify-center gap-5 md:min-h-80">
      <div aria-hidden className="flex w-full justify-between px-3">
        {Array.from({ length: BULBS }, (_, index) => (
          <span
            key={index}
            className={cn("size-1.25 rounded-full bg-accent shadow-bulb-low animate-bulb motion-reduce:animate-none")}
            style={{ animationDelay: `${(index % 3) * 300}ms` }}
          />
        ))}
      </div>
      <p role="status" className="text-13 text-text-muted">
        Looking beyond your list…
      </p>
    </div>
  );
}

/** "Something new" didn't come back: too many spins in a row, or the providers didn't answer. */
export function SurpriseTrouble({ busy, onRetry }: { busy: boolean; onRetry: () => void }) {
  return (
    <div aria-live="polite" className="flex min-h-74 flex-col items-center justify-center gap-3 text-center md:min-h-80">
      <p className="text-14 text-text-muted">
        {busy ? "That's a lot of spins. Give it a few seconds." : "Couldn't reach AniList or TMDB. Check your connection."}
      </p>
      <Button variant="secondary" onClick={onRetry} className="h-11 px-4.5">
        Try again
      </Button>
    </div>
  );
}
