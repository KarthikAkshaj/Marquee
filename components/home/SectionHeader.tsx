import type { ReactNode } from "react";

/** "CONTINUE ··· See all 4": mono label left, a quiet note or link right (handoff §01). */
export function SectionHeader({ id, title, aside }: { id: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 md:mb-3.5">
      <h2 id={id} className="font-mono text-[11px] font-semibold tracking-[.12em] text-text-muted uppercase md:text-[12.5px] md:tracking-[.1em]">
        {title}
      </h2>
      {aside}
    </div>
  );
}
