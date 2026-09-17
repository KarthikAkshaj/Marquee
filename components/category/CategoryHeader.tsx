"use client";

import { Plus } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/Button";
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
};

/** Serif name, glowing dot and count, then the toolbar (handoff §02). */
export function CategoryHeader({ category, count, params, query, onQueryChange, filterRef, onAdd }: CategoryHeaderProps) {
  const style = categoryStyle(category.color);
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3 md:gap-4">
          <h1 className="font-display opsz-120 text-[42px] leading-none wrap-break-word md:text-[54px]">
            {category.name}
          </h1>
          <p className="flex shrink-0 items-center gap-2 pb-1.5 font-mono text-12 text-text-muted md:pb-2.25 md:text-13">
            <span aria-hidden className={cn("size-2 rounded-full", style.dot, style.glow)} />
            {count} {count === 1 ? "title" : "titles"}
          </p>
        </div>
        <Button onClick={onAdd} className="h-11 shrink-0 gap-1.5 px-3.5 text-13 shadow-cta-sm md:hidden">
          <Plus aria-hidden className="size-4" strokeWidth={2.4} />
          Add
        </Button>
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
