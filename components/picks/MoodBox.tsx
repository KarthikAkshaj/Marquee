"use client";

import { Search } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { MOOD_WORD_MAX, forYouHref, moodParam, readMood } from "@/lib/moods";
import { showPicks } from "./useShelfParam";

/**
 * "Or type one": any word as a mood (SPEC §20). A word that means one of the
 * moods ("military") picks that chip; any other ("heist") is looked up in
 * each provider's own genres, tags and keywords. The keyboard goes away once
 * it's sent, so the picks are in view.
 */
export function MoodBox({ shelf }: { shelf: string | null }) {
  const [text, setText] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const choice = readMood(text);
    if (!choice) {
      setHint(text.trim() ? "Letters and numbers only, up to 40 of them." : "Type a word or two, like heist or time travel.");
      return;
    }
    setHint(null);
    setText("");
    field.current?.blur();
    showPicks(forYouHref({ shelf, mood: moodParam(choice) }));
  }

  return (
    <form role="search" aria-label="Type a mood" onSubmit={submit} className="w-full md:w-60">
      <label className="flex h-11 items-center gap-2 rounded-full border border-white/8 bg-elevated px-3.5 transition-colors focus-within:border-accent/40 md:h-8.5">
        <Search aria-hidden className="size-3.5 shrink-0 text-text-muted" strokeWidth={2.2} />
        <span className="sr-only">Mood</span>
        <input
          ref={field}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={MOOD_WORD_MAX}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (hint) setHint(null);
          }}
          placeholder="Or type one: heist, time travel"
          aria-describedby={hint ? "mood-hint" : undefined}
          // 16px on phones, or iPhones zoom the page in on focus.
          className="min-w-0 flex-1 bg-transparent text-16 text-text outline-none placeholder:text-text-muted md:text-[12.5px]"
        />
      </label>
      {hint && (
        <p id="mood-hint" role="status" className="mt-1.5 px-3.5 text-12 text-text-muted">
          {hint}
        </p>
      )}
    </form>
  );
}
