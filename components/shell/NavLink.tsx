"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useGlide } from "@/components/ui/Glide";
import { cn } from "@/lib/utils";

/**
 * Only decides whether this link is the current page. All styling stays with
 * the caller via `aria-[current=page]:` and `group-aria-[current=page]:`.
 * Inside a GlideGroup, `pill` is the current page's background, which glides
 * to the next page's link rather than jumping (U20).
 */
export function NavLink({
  href,
  match = href,
  pill,
  className,
  children,
}: {
  href: string;
  /**
   * The section this link stands for, when it opens one page inside it: the
   * Settings link goes straight to Profile but stays current on every tab.
   */
  match?: string;
  /** Background classes for the gliding current-page highlight. */
  pill?: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === match || pathname.startsWith(`${match}/`);
  const { bind, frames } = useGlide(match, active, pill);

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("group relative isolate", className)} {...bind}>
      {frames}
      {children}
    </Link>
  );
}
