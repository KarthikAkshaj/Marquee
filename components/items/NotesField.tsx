"use client";

import { useEffect, useId, useRef, useState } from "react";

const MAX = 2000;

/** Blank notes are no notes. */
const normalise = (text: string) => (text.trim() ? text : null);

type NotesFieldProps = {
  value: string | null;
  onSave: (notes: string | null) => void;
};

/** Saves when you click away (SPEC §8.6), and on the way out if the sheet closes first. */
export function NotesField({ value, onSave }: NotesFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? "");
  const [saved, setSaved] = useState(false);
  const latest = useRef({ draft, value, onSave });

  useEffect(() => {
    latest.current = { draft, value, onSave };
  });

  // Closing the sheet unmounts the textarea without a blur.
  useEffect(
    () => () => {
      const { draft: text, value: stored, onSave: save } = latest.current;
      if (normalise(text) !== stored) save(normalise(text));
    },
    [],
  );

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [saved]);

  function save() {
    if (normalise(draft) === value) return;
    onSave(normalise(draft));
    setSaved(true);
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="label-mono tracking-[.12em] text-text-muted">
          Notes
        </label>
        <span aria-live="polite" className="font-mono text-[11px] text-text-muted">
          {saved ? "Saved" : draft.length > MAX - 200 ? `${draft.length} / ${MAX}` : ""}
        </span>
      </div>
      <textarea
        id={id}
        value={draft}
        maxLength={MAX}
        rows={3}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        placeholder="Where you left off, what hit hard, who told you to watch it…"
        className="field-sizing-content block max-h-72 min-h-24 w-full resize-none rounded-card border border-border bg-surface px-3.5 py-3 text-[13.5px] leading-[1.55] text-text transition-[border-color,box-shadow] duration-150 surface-highlight placeholder:text-text-faint focus-visible:border-accent/40 focus-visible:shadow-input-focus focus-visible:outline-none md:px-4"
      />
    </div>
  );
}
