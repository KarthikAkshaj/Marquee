"use client";

import { Check, ChevronDown, Plus, Search, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import type { Ref } from "react";
import { Button } from "@/components/ui/Button";
import { SORTS, SORT_LABELS, SORT_SHORT_LABELS, categoryHref, type CategoryParams, type SortKey } from "@/lib/items";
import { cn } from "@/lib/utils";

type CategoryToolbarProps = {
  slug: string;
  params: CategoryParams;
  query: string;
  onQueryChange: (query: string) => void;
  filterRef: Ref<HTMLInputElement>;
  onAdd: () => void;
};

const control =
  "flex h-11 items-center rounded-nav border border-border bg-surface text-[12.5px] md:h-8.5";

/** Filter, sort, grid/list, favourites and add (handoff §02). */
export function CategoryToolbar({ slug, params, query, onQueryChange, filterRef, onAdd }: CategoryToolbarProps) {
  const router = useRouter();
  const go = (patch: Partial<CategoryParams>) =>
    router.replace(categoryHref(slug, params, patch), { scroll: false });

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className={cn(control, "w-full gap-2 px-3 focus-within:border-accent/40 md:w-52.5")}>
        <Search aria-hidden className="size-3.25 shrink-0 text-text-muted" strokeWidth={2.2} />
        <span className="sr-only">Filter titles</span>
        <input
          ref={filterRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter titles…"
          aria-keyshortcuts="/"
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted"
        />
        <kbd className="hidden rounded-[4px] border border-border px-1.5 font-mono text-[10.5px] text-text-muted md:inline">
          /
        </kbd>
      </label>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className={cn(control, "gap-1.5 px-3 text-text hover:border-border-strong")}>
          Sort <span className="text-text-muted md:hidden">{SORT_SHORT_LABELS[params.sort]}</span>
          <span className="hidden text-text-muted md:inline">{SORT_LABELS[params.sort]}</span>
          <ChevronDown aria-hidden className="size-3.5 text-text-muted" strokeWidth={2} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 min-w-48 rounded-card border border-white/10 bg-menu p-1.5 shadow-menu"
          >
            <DropdownMenu.RadioGroup value={params.sort} onValueChange={(value) => go({ sort: value as SortKey })}>
              {SORTS.map((sort) => (
                <DropdownMenu.RadioItem
                  key={sort}
                  value={sort}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-nav px-2.5 text-13 outline-none select-none data-highlighted:bg-white/5 data-[state=checked]:text-accent"
                >
                  <span className="flex-1">{SORT_LABELS[sort]}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden className="size-3.5" strokeWidth={2.2} />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div role="group" aria-label="View" className={cn(control, "gap-0.75 p-0.75")}>
        {(["grid", "list"] as const).map((view) => (
          <button
            key={view}
            type="button"
            aria-pressed={params.view === view}
            onClick={() => go({ view })}
            className="h-full rounded-pill px-2.5 text-12 text-text-muted capitalize transition-colors hover:text-text aria-pressed:bg-elevated aria-pressed:text-text"
          >
            {view}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-pressed={params.fav}
        aria-label="Favourites only"
        onClick={() => go({ fav: !params.fav })}
        className={cn(
          control,
          "w-11 justify-center gap-1.5 text-text-muted md:w-auto md:px-3 transition-colors hover:text-text aria-pressed:border-accent/40 aria-pressed:text-accent",
        )}
      >
        <Star aria-hidden className={cn("size-3.5", params.fav && "fill-accent")} strokeWidth={1.8} />
        <span className="hidden md:inline">Favourites</span>
      </button>

      <Button
        onClick={onAdd}
        aria-keyshortcuts="n"
        className="ml-auto hidden h-8.5 gap-1.5 rounded-nav px-3.5 text-[12.5px] shadow-cta-sm md:inline-flex"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.4} />
        Add title
      </Button>
    </div>
  );
}
