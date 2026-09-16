"use client";

import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { categoryHref, type CategoryParams, type StatusTab } from "@/lib/items";
import { ITEM_STATUSES, statusLabels, type CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";

type StatusTabsProps = {
  slug: string;
  kind: CategoryKind;
  params: CategoryParams;
  counts: Record<StatusTab, number>;
};

/** All · Plan to Watch · Watching · … with counts; the underline slides between them (SPEC §9.5). */
export function StatusTabs({ slug, kind, params, counts }: StatusTabsProps) {
  const labels = statusLabels(kind);
  const tabs: { key: StatusTab; label: string }[] = [
    { key: "all", label: "All" },
    ...ITEM_STATUSES.map((status) => ({ key: status, label: labels[status] })),
  ];

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label="Filter by status"
        className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex min-w-max gap-5 border-b border-border md:gap-6.5">
          {tabs.map(({ key, label }) => {
            const active = params.status === key;
            return (
              <li key={key}>
                <Link
                  href={categoryHref(slug, params, { status: key })}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className="group relative flex min-h-11 items-end gap-1.75 px-0.5 pb-3.25 md:min-h-0"
                >
                  <span
                    className={cn(
                      "text-[13.5px] whitespace-nowrap transition-colors",
                      active ? "font-semibold text-text" : "text-text-muted group-hover:text-text",
                    )}
                  >
                    {label}
                  </span>
                  <span className={cn("font-mono text-[11px]", active ? "text-accent" : "text-text-muted")}>
                    {String(counts[key]).padStart(2, "0")}
                  </span>
                  {active && (
                    <motion.span
                      layoutId={`status-underline-${slug}`}
                      transition={{ type: "spring", stiffness: 380, damping: 36 }}
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent shadow-tab"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}
