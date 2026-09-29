"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlideGroup, useGlide } from "@/components/ui/Glide";
import { cn } from "@/lib/utils";

export type SettingsTab = {
  href: string;
  label: string;
  /** Small mono count beside the tab, e.g. "04" categories. */
  meta?: string;
};

/**
 * Left tab list on desktop, segmented tabs across the top on phones (SPEC §8.10).
 * The current tab's highlight, amber bar and all, glides to the next tab (U20).
 */
export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings">
      <GlideGroup id="settings-tabs">
        {/* Four tabs just fit a phone; on a narrower one the row scrolls inside its box rather than spilling out of it. */}
        <ul className="flex gap-0.5 overflow-x-auto rounded-[10px] border border-border bg-surface p-1 [scrollbar-width:none] md:w-46.5 md:flex-col md:gap-0.75 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <li key={tab.href} className="flex-1 shrink-0 md:flex-none">
              <TabLink tab={tab} active={pathname === tab.href || pathname.startsWith(`${tab.href}/`)} />
            </li>
          ))}
        </ul>
      </GlideGroup>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: SettingsTab; active: boolean }) {
  const { bind, frames } = useGlide(
    tab.href,
    active,
    "bg-accent/10",
    <span className="absolute top-2.25 bottom-2.25 left-0 hidden w-0.5 rounded-full bg-accent shadow-mark-xs md:block" />,
  );

  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative isolate flex min-h-11 items-center justify-center gap-2 rounded-[7px] px-2 text-13 whitespace-nowrap transition-colors md:justify-start md:gap-2.5 md:rounded-[9px] md:px-3 md:py-2.5 md:text-[13.5px]",
        active ? "font-semibold text-text" : "text-text-muted hover:text-text",
      )}
      {...bind}
    >
      {frames}
      <span className="md:flex-1">{tab.label}</span>
      {tab.meta && <span className={cn("font-mono text-[10.5px]", active ? "text-accent" : "text-text-muted")}>{tab.meta}</span>}
    </Link>
  );
}
