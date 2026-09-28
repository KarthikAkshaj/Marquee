import { formatAverage, formatCount, type Ratings } from "@/lib/stats";
import { ChartTable } from "./ChartTable";
import { ColumnChart, type ChartColumn } from "./ColumnChart";
import { StatsCard } from "./StatsCard";

/** A word on the average, so the chart has an opinion. */
function verdict(average: number): string {
  if (average >= 8) return "Easy to please.";
  if (average <= 5) return "Tough crowd.";
  return "Fair and square.";
}

const titles = (count: number) => `${formatCount(count)} ${count === 1 ? "title" : "titles"}`;

/** A column per score from 1 to 10, with the average drawn across it. */
export function RatingsCard({ ratings, className }: { ratings: Ratings; className?: string }) {
  if (ratings.average === null || ratings.mode === null) {
    return (
      <StatsCard
        id="ratings-heading"
        label="How you rate"
        insight="No ratings yet."
        detail="Give a title a score from its sheet and this fills in."
        className={className}
      />
    );
  }

  const average = formatAverage(ratings.average);
  const columns: ChartColumn[] = ratings.scores.map(({ score, count }) => ({
    key: String(score),
    label: String(score),
    value: count,
    name: `Scored ${score} out of 10`,
    summary: titles(count),
  }));

  return (
    <StatsCard
      id="ratings-heading"
      label="How you rate"
      insight={`Mostly ${ratings.mode}s. ${verdict(ratings.average)}`}
      detail={`Averaging ${average} across ${titles(ratings.rated)}.`}
      footnote={
        ratings.unratedFinished > 0 &&
        `${formatCount(ratings.unratedFinished)} finished ${ratings.unratedFinished === 1 ? "title is" : "titles are"} still waiting for a score.`
      }
      table={
        <ChartTable
          caption="Titles per score"
          headers={["Score", "Titles"]}
          rows={columns.map((column) => ({ key: column.key, label: `${column.label} / 10`, value: String(column.value) }))}
        />
      }
      className={className}
    >
      <ColumnChart
        label="Titles per score, 1 to 10"
        columns={columns}
        marker={{ at: ratings.average - 1, label: `avg ${average}` }}
        initial={ratings.mode - 1}
      />
    </StatsCard>
  );
}
