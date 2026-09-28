import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  id: string;
  /** The mono label, which is also the section's heading: "How you rate". */
  label: string;
  /** The one thing to take away, in words, before any chart. */
  insight: ReactNode;
  /** A quieter line under the insight. */
  detail?: ReactNode;
  children?: ReactNode;
  /** Small print under everything: what was left out, and why. */
  footnote?: ReactNode;
  /** The chart as a table, folded away under the small print. */
  table?: ReactNode;
  className?: string;
};

/** One section of /stats: a label, a sentence that says what the chart shows, the chart, and its small print. */
export function StatsCard({ id, label, insight, detail, children, footnote, table, className }: StatsCardProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn("reveal flex flex-col rounded-tile border border-border bg-surface px-4 py-4.5 surface-highlight md:px-6 md:py-5.5", className)}
    >
      <h2 id={id} className="label-mono text-text-muted">
        {label}
      </h2>
      <p className="mt-2.5 text-[17px] leading-snug font-medium text-balance text-text md:text-20">{insight}</p>
      {detail && <p className="mt-1 text-13 leading-normal text-pretty text-text-muted md:text-14">{detail}</p>}
      {children}
      {footnote && <p className="mt-4 text-12 leading-normal text-text-muted md:text-13">{footnote}</p>}
      {table}
    </section>
  );
}
