"use client";

import { Check, Ellipsis, Pencil, Star, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { incrementPatch, progressUnit, type Item } from "@/lib/items";
import { ITEM_STATUSES, STATUS_STYLE, statusLabels, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export type ItemQuickActions = {
  /** Opens the item sheet. */
  onOpen: (item: Item) => void;
  onStatusChange: (item: Item, status: ItemStatus) => void;
  onIncrement: (item: Item) => void;
  onToggleFavorite: (item: Item) => void;
  /** Asks first; nothing is deleted until the user confirms. */
  onDelete: (item: Item) => void;
};

type QuickActionsProps = {
  item: Item;
  kind: CategoryKind;
  actions: ItemQuickActions;
  className?: string;
};

/*
 * Sized by the poster, not the viewport (the parent is an @container). The
 * handoff's row needs a 160px card; 1280px screens give ~142px, so chips
 * tighten, and on very narrow cards Status takes its own row.
 */
const row = "flex flex-wrap gap-1 px-1.5 @min-[134px]:flex-nowrap @min-[160px]:gap-1.25 @min-[160px]:px-2";
const chip =
  "flex h-6.5 grow items-center justify-center rounded-pill bg-white/12 text-[10.5px] text-text transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:text-text-faint disabled:hover:bg-white/12 @min-[134px]:grow-0";
const iconChip = "@min-[134px]:w-5.5 @min-[160px]:w-6";
const menu = "z-50 min-w-44 rounded-card border border-white/10 bg-menu p-1.5 shadow-menu";
const menuItem =
  "flex min-h-9 cursor-pointer items-center gap-2 rounded-nav px-2.5 text-13 outline-none select-none data-highlighted:bg-white/5";

/** Status · +1 · favourite · more, along the foot of a poster (handoff §02). */
export function QuickActions({ item, kind, actions, className }: QuickActionsProps) {
  const labels = statusLabels(kind);
  const counts = progressUnit(kind) !== null;

  return (
    <div role="group" aria-label={`${item.title} actions`} className={cn(row, className)}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={`Status: ${labels[item.status]}`}
          className="h-6.5 min-w-0 grow basis-full truncate rounded-pill bg-accent px-1 text-[10.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover @min-[134px]:basis-0"
        >
          Status
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={menu}>
            <DropdownMenu.RadioGroup
              value={item.status}
              onValueChange={(value) => actions.onStatusChange(item, value as ItemStatus)}
            >
              {ITEM_STATUSES.map((status) => (
                <DropdownMenu.RadioItem key={status} value={status} className={menuItem}>
                  <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_STYLE[status].fill)} />
                  <span className="flex-1">{labels[status]}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden className="size-3.5 text-accent" strokeWidth={2.2} />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {counts && (
        <button
          type="button"
          aria-label="Add 1 to progress"
          disabled={incrementPatch(item) === null}
          onClick={() => actions.onIncrement(item)}
          className={cn(chip, "font-mono @min-[134px]:w-6.5 @min-[160px]:w-7")}
        >
          +1
        </button>
      )}

      <button
        type="button"
        aria-label="Favourite"
        aria-pressed={item.is_favorite}
        onClick={() => actions.onToggleFavorite(item)}
        className={cn(chip, iconChip, "text-accent")}
      >
        <Star aria-hidden className={cn("size-3", item.is_favorite && "fill-accent")} strokeWidth={2} />
      </button>

      {/* Not modal: its items open the sheet or a confirm dialog, and two focus traps fight. */}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger aria-label="More actions" className={cn(chip, iconChip)}>
          <Ellipsis aria-hidden className="size-3.5" strokeWidth={2} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className={menu}>
            <DropdownMenu.Item onSelect={() => actions.onOpen(item)} className={menuItem}>
              <Pencil aria-hidden className="size-3.5 text-text-muted" strokeWidth={1.8} />
              Edit details
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="mx-2 my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={() => actions.onDelete(item)}
              className={cn(
                menuItem,
                "text-dropped-muted data-highlighted:bg-dropped-muted/12 data-highlighted:text-dropped",
              )}
            >
              <Trash2 aria-hidden className="size-3.5" strokeWidth={1.8} />
              Delete…
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
