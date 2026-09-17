"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ellipsis, GripVertical, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { categoryStyle } from "@/lib/categories";
import type { CategoryWithCount } from "@/lib/queries";
import type { CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";
import { KindMenu } from "./KindMenu";

type CategoryRowProps = {
  category: CategoryWithCount;
  onRename: (name: string) => void;
  onKind: (kind: CategoryKind) => void;
  /** Name, type, colour and icon in one dialog. */
  onEdit: () => void;
  onDelete: () => void;
};

const menuItem =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-nav px-2.5 text-13 outline-none select-none md:min-h-9";

/** One draggable category (handoff §07): grip, colour, icon, name, type, count, more. */
export function CategoryRow({ category, onRename, onKind, onEdit, onDelete }: CategoryRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = categoryStyle(category.color);
  const count = category.itemCount;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-2 border-b border-white/5 bg-surface py-2 pr-2 pl-1 last:border-b-0 md:gap-3.25 md:py-2.5 md:pr-3 md:pl-2",
        isDragging && "z-10 bg-elevated shadow-menu",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Move ${category.name}`}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-nav text-text-faint transition-colors hover:text-text-muted active:cursor-grabbing md:size-8"
      >
        <GripVertical aria-hidden className="size-4" strokeWidth={1.8} />
      </button>
      <span aria-hidden className={cn("hidden size-2.75 shrink-0 rounded-full md:block", style.dot, style.glow)} />
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${category.name}`}
        className="hidden size-7 shrink-0 items-center justify-center rounded-nav border border-white/8 bg-white/5 transition-colors hover:border-white/20 md:flex"
      >
        <CategoryIcon name={category.icon} className={cn("size-3.5", style.text)} />
      </button>

      <div className="min-w-0 flex-1">
        <InlineEdit
          label="Name"
          value={category.name}
          maxLength={40}
          onCommit={(name) => (name ? onRename(name) : toast.error("Give it a name."))}
          className="-mx-1 block min-h-11 max-w-full truncate px-1 text-[13.5px] font-medium md:min-h-0"
          inputClassName="w-full text-[13.5px]"
        >
          {category.name}
        </InlineEdit>
        {/* Phones: the icon sits with the count; the name keeps a 44px target and overlaps this line a little. */}
        <p className="-mt-3 flex items-center gap-1.5 font-mono text-[11px] text-text-muted md:hidden">
          <CategoryIcon name={category.icon} className={cn("size-3", style.text)} />
          {count} {count === 1 ? "title" : "titles"}
        </p>
      </div>

      <KindMenu kind={category.kind} categoryName={category.name} onChange={onKind} />
      <span className="hidden w-13 shrink-0 text-right font-mono text-[12.5px] text-text-muted md:block">
        <span className="sr-only">{count === 1 ? "1 title" : `${count} titles`}</span>
        <span aria-hidden>{String(count).padStart(3, "0")}</span>
      </span>

      {/* Not modal: its items open dialogs, and two focus traps fight. */}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label={`More for ${category.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-nav text-text-muted transition-colors hover:text-text data-[state=open]:text-text md:size-8"
        >
          <Ellipsis aria-hidden className="size-4" strokeWidth={2} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-48 rounded-card border border-white/10 bg-menu p-1.5 shadow-menu"
          >
            <DropdownMenu.Item onSelect={onEdit} className={cn(menuItem, "data-highlighted:bg-white/5")}>
              <Pencil aria-hidden className="size-3.5 text-text-muted" strokeWidth={1.8} />
              Edit category…
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="mx-2 my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={onDelete}
              className={cn(menuItem, "text-dropped-muted data-highlighted:bg-dropped-muted/12 data-highlighted:text-dropped")}
            >
              <Trash2 aria-hidden className="size-3.5" strokeWidth={1.8} />
              Delete category…
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </li>
  );
}
