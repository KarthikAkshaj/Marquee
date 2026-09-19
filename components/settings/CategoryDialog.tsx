"use client";

import { Loader2 } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, useTransition, type FormEvent } from "react";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CategoryActionResult } from "@/lib/actions/categories";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_KINDS, KIND_NAMES, categoryStyle, isCategoryColor, isCategoryIcon } from "@/lib/categories";
import { statusLabels } from "@/lib/status";
import { useReturnFocus } from "@/lib/use-return-focus";
import { cn } from "@/lib/utils";
import type { CategoryInput } from "@/lib/validators";
import { SwatchPicker } from "./SwatchPicker";

type CategoryDialogProps = {
  open: boolean;
  /** An existing category to edit, or nothing for a new one. Colour and icon arrive as stored strings. */
  initial?: { name: string; kind: CategoryInput["kind"]; color: string; icon: string };
  onClose: () => void;
  /** Resolves with the server's answer; the dialog closes on success. */
  onSubmit: (values: CategoryInput) => Promise<CategoryActionResult>;
};

const DEFAULTS: CategoryInput = { name: "", kind: "custom", color: "sky", icon: "sparkles" };

/** New category, or name, type, colour and icon for an existing one (SPEC §8.10). */
export function CategoryDialog({ open, initial, onClose, onSubmit }: CategoryDialogProps) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <Dialog.Content onOpenAutoFocus={returnFocus.remember} onCloseAutoFocus={returnFocus.restore} className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-110 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-tile border border-white/10 bg-sheet shadow-modal">
          <CategoryForm initial={initial} onClose={onClose} onSubmit={onSubmit} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CategoryForm({ initial, onClose, onSubmit }: Omit<CategoryDialogProps, "open">) {
  const editing = initial !== undefined;
  // Only the four editable fields, whatever else `initial` carries.
  const [values, setValues] = useState<CategoryInput>({
    name: initial?.name ?? DEFAULTS.name,
    kind: initial?.kind ?? DEFAULTS.kind,
    color: initial?.color && isCategoryColor(initial.color) ? initial.color : DEFAULTS.color,
    icon: initial?.icon && isCategoryIcon(initial.icon) ? initial.icon : DEFAULTS.icon,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const words = statusLabels(values.kind);
  const style = categoryStyle(values.color);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) return setError("Give it a name.");
    startTransition(async () => {
      const result = await onSubmit({ ...values, name: values.name.trim() });
      if (result.ok) onClose();
      else setError(result.message);
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="border-b border-border px-5 pt-4.5 pb-3.5">
        <Dialog.Title className="font-display text-28 leading-[1.1]">{editing ? "Edit category" : "New category"}</Dialog.Title>
        <Dialog.Description className="mt-1.25 text-12 text-text-muted">
          {editing ? "Its titles stay put." : "It shows up in the sidebar straight away."}
        </Dialog.Description>
      </div>

      <div className="flex flex-col gap-4.5 px-5 py-4.5">
        <div className="flex items-end gap-3">
          <span aria-hidden className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-card border border-white/8 bg-white/5">
            <CategoryIcon name={values.icon} className={cn("size-4.5", style.text)} />
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor="category-name" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
              Name
            </label>
            <Input
              id="category-name"
              value={values.name}
              maxLength={40}
              autoComplete="off"
              placeholder="K-Dramas"
              onChange={(event) => set("name", event.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
        </div>

        <SwatchPicker
          label="Type"
          hint={`${words.planned} · ${words.in_progress} · ${words.completed}`}
          options={CATEGORY_KINDS.map((kind) => ({ value: kind, label: KIND_NAMES[kind] }))}
          value={values.kind}
          onChange={(kind) => set("kind", kind)}
          variant="text"
        />
        <SwatchPicker
          label="Colour"
          options={CATEGORY_COLORS.map((color) => ({
            value: color,
            label: color[0].toUpperCase() + color.slice(1),
            content: <span className={cn("size-4.5 rounded-full", categoryStyle(color).dot)} />,
          }))}
          value={values.color}
          onChange={(color) => set("color", color)}
        />
        <SwatchPicker
          label="Icon"
          options={CATEGORY_ICONS.map((icon) => ({
            value: icon,
            label: icon.replace("-2", "").replace("-", " "),
            content: <CategoryIcon name={icon} className="size-4" />,
          }))}
          value={values.icon}
          onChange={(icon) => set("icon", icon)}
        />

        {error && (
          <p role="alert" className="text-13 text-dropped">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/40 px-5 py-3.5">
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" className="h-11 px-4 md:h-9.5">
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" disabled={pending} aria-busy={pending} className="h-11 px-4.5 shadow-cta-sm md:h-9.5">
          {pending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
          {editing ? "Save" : pending ? "Creating…" : "Create"}
        </Button>
      </div>
    </form>
  );
}
