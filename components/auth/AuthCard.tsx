import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The floating card both login states sit in. */
export function AuthCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-sheet border border-white/8 bg-elevated shadow-dialog-sm md:shadow-dialog",
        className,
      )}
    >
      {children}
    </div>
  );
}
