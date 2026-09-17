"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SettingsTab = {
  href: string;
  label: string;
  /** Small mono count beside the tab, e.g. "04" categories. */
  meta?: string;
};

/**
 * Left tab list on desktop, segmented tabs across the top on phones (SPEC §8.10).
 * Tabs join as their pages land: Profile and Account come next.
 */
export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings">
      <ul className="flex gap-1 rounded-[10px] border border-border bg-surface p-1 md:w-46.5 md:flex-col md:gap-0.75 md:rounded-none md:border-0 md:bg-transparent md:p-0">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1 md:flex-none">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center justify-center gap-2.5 rounded-[7px] px-3 text-[13.5px] transition-colors md:justify-start md:rounded-[9px] md:py-2.5",
                  active
                    ? "bg-accent/10 font-semibold text-text"
                    : "text-text-muted hover:bg-white/4 hover:text-text",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-2.25 bottom-2.25 left-0 hidden w-0.5 rounded-full md:block",
                    active && "bg-accent shadow-mark-xs",
                  )}
                />
                <span className="md:flex-1">{tab.label}</span>
                {tab.meta && (
                  <span className={cn("font-mono text-[10.5px]", active ? "text-accent" : "text-text-muted")}>
                    {tab.meta}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
