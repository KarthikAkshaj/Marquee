"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createCategory } from "@/lib/actions/categories";
import type { CategoryWithCount } from "@/lib/queries";
import type { CategoryInput } from "@/lib/validators";
import { CategoryDialog } from "./CategoryDialog";
import { SortableCategoryList } from "./SortableCategoryList";
import { useCategoryActions } from "./useCategoryActions";

/** Only the fields that changed: re-sending an unchanged name would still mint a new URL. */
function changedFields(before: CategoryWithCount, after: CategoryInput) {
  const patch: Partial<CategoryInput> = {};
  if (after.name !== before.name) patch.name = after.name;
  if (after.kind !== before.kind) patch.kind = after.kind;
  if (after.color !== before.color) patch.color = after.color;
  if (after.icon !== before.icon) patch.icon = after.icon;
  return patch;
}

/** Settings → Categories (SPEC §8.10, handoff §07). `?new=1` (from the sidebar) opens "New category". */
export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  const router = useRouter();
  const creating = useSearchParams().get("new") === "1";
  const manage = useCategoryActions(categories);
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
  const [deleting, setDeleting] = useState<CategoryWithCount | null>(null);

  const setCreating = (open: boolean) =>
    window.history.replaceState(null, "", open ? "/settings/categories?new=1" : "/settings/categories");

  async function submit(values: CategoryInput) {
    if (editing) {
      const patch = changedFields(editing, values);
      if (Object.keys(patch).length > 0) manage.update(editing, patch);
      return { ok: true } as const;
    }
    const result = await createCategory(values);
    if (result.ok) {
      toast.success(`${values.name} is on the marquee.`, {
        action: { label: "Open", onClick: () => router.push(`/c/${result.slug}`) },
      });
    }
    return result;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-13 text-pretty text-text-muted">
        Drag to reorder; the sidebar follows. A category&apos;s type sets its words, like Watching or Playing.
      </p>

      {manage.categories.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[11px] border border-border bg-surface px-5 py-6 surface-highlight">
          <h2 className="font-display text-28 leading-[1.1]">No categories, no marquee.</h2>
          <p className="text-13 text-text-muted">Make one and it lights up in the sidebar.</p>
          <Button variant="secondary" size="sm" className="h-11 md:h-9" onClick={() => setCreating(true)}>
            New category
          </Button>
        </div>
      ) : (
        <SortableCategoryList
          categories={manage.categories}
          onReorder={manage.reorder}
          onRename={(category, name) => name !== category.name && manage.update(category, { name })}
          onKind={(category, kind) => manage.update(category, { kind })}
          onEdit={setEditing}
          onDelete={setDeleting}
          onCreate={() => setCreating(true)}
        />
      )}

      <CategoryDialog
        key={creating ? "new" : (editing?.id ?? "closed")}
        open={creating || editing !== null}
        initial={editing ?? undefined}
        onClose={() => (editing ? setEditing(null) : setCreating(false))}
        onSubmit={submit}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={
          <>
            Delete <em className="text-dropped">{deleting?.name}</em>?
          </>
        }
        description={
          deleting?.itemCount
            ? `${deleting.itemCount === 1 ? "Its 1 title goes" : `All ${deleting.itemCount} of its titles go`} with it, ratings and notes included. There's no undo.`
            : "It's empty, so nothing else goes with it."
        }
        cancelLabel="Keep it"
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) manage.remove(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}
