"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type InlineEditProps = {
  /** The saved value as text; "" when there isn't one. */
  value: string;
  /** What's being edited, e.g. "Title". Also names the input. */
  label: string;
  /** Called with the new text only when it changed. The caller validates. */
  onCommit: (next: string) => void;
  /** What shows when not editing. */
  children: ReactNode;
  className?: string;
  inputClassName?: string;
} & Pick<ComponentProps<"input">, "inputMode" | "maxLength" | "placeholder">;

/**
 * Click to edit in place: Enter or clicking away saves, Esc puts it back.
 * The input carries `data-inline-edit` so a surrounding sheet can leave Esc to it.
 */
export function InlineEdit({ value, label, onCommit, children, className, inputClassName, ...inputProps }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Enter and Esc both unmount the input, which can fire a stray blur.
  const settled = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function start() {
    settled.current = false;
    setDraft(value);
    setEditing(true);
  }

  function finish(save: boolean, refocus: boolean) {
    if (settled.current) return;
    settled.current = true;
    setEditing(false);
    if (save && draft.trim() !== value.trim()) onCommit(draft.trim());
    if (refocus) requestAnimationFrame(() => buttonRef.current?.focus());
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        data-inline-edit
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true, false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            finish(true, true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            finish(false, true);
          }
        }}
        className={cn(
          "min-w-0 rounded-[6px] border border-accent/40 bg-surface px-1.5 text-text shadow-input-focus outline-none",
          inputClassName,
        )}
        {...inputProps}
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={start}
      aria-label={`${label}: ${value || "not set"}. Edit`}
      className={cn(
        "cursor-text rounded-[6px] text-left transition-colors hover:bg-white/5",
        className,
      )}
    >
      {children}
    </button>
  );
}
