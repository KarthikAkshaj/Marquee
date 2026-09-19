"use client";

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { categoryStyle } from "@/lib/categories";
import type { CategoryWithCount } from "@/lib/queries";
import { cn } from "@/lib/utils";

type ListsSheetProps = {
  categories: CategoryWithCount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const row = "flex min-h-12 items-center gap-3 rounded-nav px-3 text-14 transition-colors hover:bg-white/5 aria-[current=page]:bg-white/6";

function Extra({ href, icon, onGo, children }: { href: string; icon: ReactNode; onGo: () => void; children: ReactNode }) {
  return (
    <Link href={href} onClick={onGo} className={cn(row, "text-text-muted hover:text-text")}>
      <span aria-hidden className="grid size-4 place-items-center">
        {icon}
      </span>
      {children}
    </Link>
  );
}

/** The phone's Categories tab (SPEC §8.3): every shelf with its count, then new shelves and Import. */
export function ListsSheet({ categories, open, onOpenChange }: ListsSheetProps) {
  const pathname = usePathname();
  const close = () => onOpenChange(false);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Lists" description="Jump to one of your shelves, add a shelf or import a list.">
      <nav aria-label="Lists" className="flex flex-col">
        {categories.map((category) => {
          const style = categoryStyle(category.color);
          const href = `/c/${category.slug}`;
          const here = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={category.id} href={href} onClick={close} aria-current={here ? "page" : undefined} className={cn(row, "text-text")}>
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", style.dot, style.glow)} />
              <span className="min-w-0 flex-1 truncate">{category.name}</span>
              <span className="font-mono text-12 text-text-muted">{category.itemCount}</span>
            </Link>
          );
        })}
        <span aria-hidden className="mx-3 my-1.5 h-px bg-border" />
        <Extra href="/settings/categories?new=1" icon={<Plus className="size-4" strokeWidth={1.8} />} onGo={close}>
          New category
        </Extra>
        <Extra href="/import" icon={<FileText className="size-4" strokeWidth={1.8} />} onGo={close}>
          Import a list
        </Extra>
      </nav>
    </BottomSheet>
  );
}
