"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { categoryStyle } from "@/lib/categories";
import type { CategoryWithCount } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * How phones reach their shelves until the bottom nav arrives (Phase 4).
 * Rows are 44px+ (SPEC §8.3 mobile rules).
 */
export function MobileListsMenu({ categories }: { categories: CategoryWithCount[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Lists"
        className="flex size-11 items-center justify-center rounded-card border border-border bg-surface text-text-muted transition-colors hover:text-text data-[state=open]:text-text"
      >
        <LayoutGrid aria-hidden className="size-4" strokeWidth={1.8} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-62 overflow-hidden rounded-[13px] border border-white/10 bg-menu p-1.5 shadow-menu"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/home"
              className="flex min-h-11 items-center gap-2.5 rounded-nav px-2.5 text-14 outline-none data-highlighted:bg-white/5"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              Home
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Label className="label-mono px-2.5 pt-3 pb-1.5 text-text-muted">Lists</DropdownMenu.Label>
          {categories.map((category) => {
            const style = categoryStyle(category.color);
            return (
              <DropdownMenu.Item key={category.id} asChild>
                <Link
                  href={`/c/${category.slug}`}
                  className="flex min-h-11 items-center gap-2.5 rounded-nav px-2.5 text-14 outline-none data-highlighted:bg-white/5"
                >
                  <span aria-hidden className={cn("size-1.75 shrink-0 rounded-full", style.dot, style.glow)} />
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  <span className="font-mono text-12 text-text-muted">{category.itemCount}</span>
                </Link>
              </DropdownMenu.Item>
            );
          })}
          <DropdownMenu.Item asChild>
            <Link
              href="/settings/categories?new=1"
              className="flex min-h-11 items-center gap-2.5 rounded-nav px-2.5 text-14 text-text-muted outline-none data-highlighted:bg-white/5 data-highlighted:text-text"
            >
              <span aria-hidden className="size-1.75 shrink-0 rounded-full border border-dashed border-white/30" />
              New category
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-2.5 my-1.5 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex min-h-11 items-center gap-2.5 rounded-nav px-2.5 text-14 outline-none data-highlighted:bg-white/5"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-white/28" />
              Settings
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
