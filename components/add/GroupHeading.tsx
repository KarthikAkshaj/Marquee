import type { ReactNode } from "react";

/** "RESULTS", "GO TO"…: the mono label over a group of palette rows (handoff §04). */
export function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <span className="block px-3 pt-2 pb-1.5 font-mono text-[10px] tracking-[.12em] text-text-muted uppercase">{children}</span>
  );
}
