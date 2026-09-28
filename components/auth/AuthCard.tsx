import type { ReactNode } from "react";
import { BulbRing } from "@/components/fun/BulbRing";
import { cn } from "@/lib/utils";

/**
 * The floating card both login states sit in, framed in marquee bulbs on
 * standby (U24). They chase while anything inside is busy: a code on its
 * way, a code being checked, the hand-off to Google.
 */
export function AuthCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "group/auth relative rounded-sheet border border-white/8 bg-elevated shadow-dialog-sm md:shadow-dialog",
        className,
      )}
    >
      {children}
      <BulbRing standby radius="22" count={72} />
    </div>
  );
}
