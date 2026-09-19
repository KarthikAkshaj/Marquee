"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type MatchSearchFormProps = {
  initial: string;
  /** "AniList", "TMDB"… */
  sourceName: string;
  onSearch: (query: string) => void;
  className?: string;
};

/** Look a title up again with other words: its full, English or original name. */
export function MatchSearchForm({ initial, sourceName, onSearch, className }: MatchSearchFormProps) {
  const [query, setQuery] = useState(initial);

  return (
    <form
      className={cn("flex gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim().length >= 2) onSearch(query.trim());
      }}
    >
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-nav border border-white/8 bg-sheet px-3 focus-within:border-accent/45 md:h-9">
        <Search aria-hidden className="size-3.5 shrink-0 text-text-muted" strokeWidth={2} />
        <span className="sr-only">Search {sourceName} for</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-13 text-text outline-none" />
      </label>
      <button type="submit" className="h-11 rounded-nav border border-white/12 bg-elevated px-3.5 text-13 text-text hover:border-accent/50 hover:text-accent md:h-9">
        Search
      </button>
    </form>
  );
}
