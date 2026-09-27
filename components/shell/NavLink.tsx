"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Only decides whether this link is the current page. All styling stays with
 * the caller via `aria-[current=page]:` and `group-aria-[current=page]:`.
 */
export function NavLink({
  href,
  match = href,
  className,
  children,
}: {
  href: string;
  /**
   * The section this link stands for, when it opens one page inside it: the
   * Settings link goes straight to Profile but stays current on every tab.
   */
  match?: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === match || pathname.startsWith(`${match}/`);

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("group", className)}>
      {children}
    </Link>
  );
}
