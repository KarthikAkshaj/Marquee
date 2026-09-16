import { cn } from "@/lib/utils";

/** Required by the TMDB, AniList and IGDB terms (SPEC §8.1). */
const TMDB_NOTICE = "This product uses the TMDB API but is not endorsed or certified by TMDB.";

function TmdbBadge() {
  return (
    <span className="tmdb-gradient inline-flex h-4.25 shrink-0 items-center rounded-[3px] px-1.75 font-mono text-[9.5px] font-medium tracking-[.08em] text-tmdb-ink">
      TMDB
    </span>
  );
}

/** Landing footer: one line on desktop, stacked on phones. */
export function FooterAttributions() {
  return (
    <div className="flex flex-col gap-1.75 font-mono text-[9.5px] leading-[1.45] text-text-muted md:flex-row md:flex-wrap md:items-center md:gap-5 md:text-[11px]">
      <span className="flex items-start gap-1.75 md:items-center md:gap-2">
        <TmdbBadge />
        {TMDB_NOTICE}
      </span>
      <span className="hidden md:inline">Anime data from AniList</span>
      <span className="hidden md:inline">Game data from IGDB</span>
      <span className="md:hidden">Anime data from AniList · Game data from IGDB</span>
    </div>
  );
}

/** Under the login card: centred, two lines. */
export function CenteredAttributions({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.25 text-center font-mono text-[9px] text-text-muted md:gap-1.75 md:text-[10.5px]",
        className,
      )}
    >
      <span className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
        <TmdbBadge />
        {TMDB_NOTICE}
      </span>
      <span className="flex items-center gap-2.5">
        Anime data from AniList
        <span aria-hidden className="text-text-ghost">
          ·
        </span>
        Game data from IGDB
      </span>
    </div>
  );
}
