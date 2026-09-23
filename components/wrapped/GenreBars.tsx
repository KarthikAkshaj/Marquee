import type { GenreSlice } from "@/lib/wrapped";

/** Five numbers don't need a charting library. Widths are the only dynamic bit. */
export function GenreBars({ genres }: { genres: GenreSlice[] }) {
  return (
    <ul className="mt-9 flex w-full flex-col gap-3.5">
      {genres.map((genre) => {
        const percent = Math.round(genre.share * 100);
        return (
          <li key={genre.name} className="flex items-center gap-3.5">
            <span className="w-24 shrink-0 text-left text-13 text-text md:w-36 md:text-14">{genre.name}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
            </span>
            <span className="w-11 shrink-0 text-right font-mono text-12 tabular-nums text-text-muted">{percent}%</span>
          </li>
        );
      })}
    </ul>
  );
}
