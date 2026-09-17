"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useId } from "react";
import type { CategoryWithCount } from "@/lib/queries";
import type { CategoryKind } from "@/lib/status";
import { CategoryRow } from "./CategoryRow";

type SortableCategoryListProps = {
  categories: CategoryWithCount[];
  onReorder: (ids: string[]) => void;
  onRename: (category: CategoryWithCount, name: string) => void;
  onKind: (category: CategoryWithCount, kind: CategoryKind) => void;
  onEdit: (category: CategoryWithCount) => void;
  onDelete: (category: CategoryWithCount) => void;
  onCreate: () => void;
};

// Rows only ever move up and down.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** Drag by the grip with a mouse or finger, or Space + arrow keys; screen readers hear names, not ids. */
export function SortableCategoryList({ categories, onReorder, onRename, onKind, onEdit, onDelete, onCreate }: SortableCategoryListProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = categories.map((category) => category.id);

  const name = (id: string | number) => categories.find((category) => category.id === id)?.name ?? "That category";
  const spot = (id: string | number) => `${ids.indexOf(String(id)) + 1} of ${ids.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} is at ${spot(over.id)}.` : `${name(active.id)} is outside the list.`),
    onDragEnd: ({ active, over }) => (over ? `${name(active.id)} dropped at ${spot(over.id)}.` : `${name(active.id)} put back.`),
    onDragCancel: ({ active }) => `${name(active.id)} put back.`,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "To reorder, press Space to pick this category up, the arrow keys to move it, then Space to drop it. Escape puts it back.",
        },
      }}
    >
      <div className="overflow-hidden rounded-[11px] border border-border bg-surface surface-highlight">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul aria-label="Categories">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onRename={(value) => onRename(category, value)}
                onKind={(kind) => onKind(category, kind)}
                onEdit={() => onEdit(category)}
                onDelete={() => onDelete(category)}
              />
            ))}
          </ul>
        </SortableContext>
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-14 w-full items-center gap-3.25 border-t border-white/5 px-4 text-13 text-text-muted transition-colors hover:bg-accent/5 hover:text-accent md:min-h-12"
        >
          <span aria-hidden className="size-2.75 rounded-full border border-dashed border-white/30" />
          New category
        </button>
      </div>
    </DndContext>
  );
}
