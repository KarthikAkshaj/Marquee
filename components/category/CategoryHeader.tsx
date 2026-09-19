"use client";

import { ImageUp } from "lucide-react";
import Link from "next/link";
import type { Ref } from "react";
import { categoryStyle } from "@/lib/categories";
import type { CategoryParams } from "@/lib/items";
import { cn } from "@/lib/utils";
import { CategoryToolbar } from "./CategoryToolbar";

type CategoryHeaderProps = {
  category: { name: string; slug: string; color: string };
  count: number;
  params: CategoryParams;
  query: string;
  onQueryChange: (query: string) => void;
  filterRef: Ref<HTMLInputElement>;
  onAdd: () => void;
  /** Hand-added titles that Find covers could match (none on custom shelves). */
  unmatched: number;
};

/** Serif name, glowing dot and count, then the toolbar (handoff §02). */
export function CategoryHeader({ category, count, params, query, onQueryChange, filterRef, onAdd, unmatched }: CategoryHeaderProps) {
  const style = categoryStyle(category.color);
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      {/* The name keeps its width; the toolbar wraps beside it instead of sliding under it. */}
      <div className="min-w-0 lg:max-w-1/2 lg:shrink-0">
        <div className="flex min-w-0 items-baseline gap-3 md:gap-4">
          <h1 className="font-display opsz-120 text-[42px] leading-none wrap-break-word md:text-[54px]">
            {category.name}
          </h1>
          <p className="flex shrink-0 items-center gap-2 pb-1.5 font-mono text-12 text-text-muted md:pb-2.25 md:text-13">
            <span aria-hidden className={cn("size-2 rounded-full", style.dot, style.glow)} />
            {count} {count === 1 ? "title" : "titles"}
          </p>
        </div>
        {/* Its own line, so it never crowds the toolbar. */}
        {unmatched > 0 && (
          <Link
            href={`/c/${encodeURIComponent(category.slug)}/match`}
            className="-mb-2.5 flex min-h-11 w-fit items-center gap-1.5 text-12 text-accent transition-colors hover:text-accent-bright md:mt-1.5 md:mb-0 md:min-h-0 md:text-13"
          >
            <ImageUp aria-hidden className="size-3.5" strokeWidth={1.8} />
            Find covers for {unmatched}
          </Link>
        )}
      </div>
      <CategoryToolbar
        slug={category.slug}
        params={params}
        query={query}
        onQueryChange={onQueryChange}
        filterRef={filterRef}
        onAdd={onAdd}
      />
    </header>
  );
}
