import { EMPTY } from "@/lib/items";
import { GENRE_MIN_RATED, formatAverage, formatCount, type Genres } from "@/lib/stats";
import { StatsCard } from "./StatsCard";

function insight({ rows, favourite }: Genres): { line: string; detail: string } {
  if (favourite) {
    return {
      line: `You rate ${favourite.name} highest.`,
      detail: `${formatAverage(favourite.average!)} on average across ${formatCount(favourite.rated)} scored titles.`,
    };
  }
  if (rows.length > 0) {
    return {
      line: `Mostly ${rows[0].name}.`,
      detail: `Score ${GENRE_MIN_RATED} titles in a genre and your average for it shows up here.`,
    };
  }
  return {
    line: "No genres yet.",
    detail: "Titles added from search bring their genres along. Hand-added ones don't have any.",
  };
}

const heading = "py-1.5 font-mono text-[10.5px] font-normal tracking-[.1em] text-text-muted uppercase";

/** The genres you track most, and what you think of each: the groundwork for recommendations. */
export function GenresCard({ genres, className }: { genres: Genres; className?: string }) {
  const { line, detail } = insight(genres);
  const most = genres.rows[0]?.titles ?? 0;

  return (
    <StatsCard
      id="genres-heading"
      label="Genres"
      insight={line}
      detail={detail}
      footnote={
        genres.rows.length > 0 &&
        genres.untagged > 0 &&
        `${formatCount(genres.untagged)} ${genres.untagged === 1 ? "title has" : "titles have"} no genres, mostly ones added by hand.`
      }
      className={className}
    >
      {genres.rows.length > 0 && (
        <table className="mt-4 w-full table-fixed text-13">
          <caption className="sr-only">Your most tracked genres, with your average score in each</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className={`${heading} w-[38%] md:w-[30%]`}>
                Genre
              </th>
              <th scope="col" className={heading}>
                Titles
              </th>
              <th scope="col" className={`${heading} w-15 text-right`}>
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {genres.rows.map((row) => (
              <tr key={row.name} className="border-t border-white/5">
                <th scope="row" className="truncate py-2 pr-3 text-left font-normal text-text">
                  {row.name}
                </th>
                <td className="py-2">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/6">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(row.titles / most) * 100}%` }} />
                    </span>
                    <span className="w-9 shrink-0 text-right font-mono text-text">{formatCount(row.titles)}</span>
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-text">
                  {row.average === null ? (
                    <>
                      <span aria-hidden className="text-text-muted">
                        {EMPTY}
                      </span>
                      <span className="sr-only">Not enough scores yet</span>
                    </>
                  ) : (
                    formatAverage(row.average)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </StatsCard>
  );
}
