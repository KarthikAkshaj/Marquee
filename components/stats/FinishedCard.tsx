import { formatCount, monthName, type Finishes, type StatsShelf } from "@/lib/stats";
import { ChartTable } from "./ChartTable";
import { ColumnChart, type ChartColumn } from "./ColumnChart";
import { StatsCard } from "./StatsCard";

type FinishedCardProps = {
  finishes: Finishes;
  /** Every shelf, in sidebar order: the hover breakdown names them. Null parts when one shelf is in view. */
  shelves: readonly StatsShelf[] | null;
  className?: string;
};

function insight({ total, peak }: Finishes): string {
  if (total === 0 || !peak) return "Nothing finished in the last year.";
  const count = total === 1 ? "One title" : `${formatCount(total)} titles`;
  return `${count} finished in the last year. ${monthName(peak.month)} was the big one.`;
}

/** Finishes per month for the last twelve months, with the undated ones owned up to underneath. */
export function FinishedCard({ finishes, shelves, className }: FinishedCardProps) {
  const columns: ChartColumn[] = finishes.months.map((column, index) => ({
    key: column.key,
    label: monthName(column.month).slice(0, 3),
    shortLabel: monthName(column.month)[0],
    // The year where it changes, and on the first column so the start is dated.
    sublabel: index === 0 || column.month === 0 ? String(column.year) : undefined,
    current: index === finishes.months.length - 1,
    value: column.count,
    name: `${monthName(column.month)} ${column.year}`,
    summary: `${formatCount(column.count)} finished`,
    parts: shelves
      ?.filter((shelf) => column.byShelf[shelf.id])
      .map((shelf) => ({ label: shelf.name, value: column.byShelf[shelf.id], color: shelf.color })),
  }));

  return (
    <StatsCard
      id="finished-heading"
      label="Finished · last 12 months"
      insight={insight(finishes)}
      detail={finishes.total === 0 ? "Finish something and it lands here, dated." : undefined}
      footnote={
        finishes.undated > 0 &&
        `Plus ${formatCount(finishes.undated)} finished before Marquee kept dates, so they sit outside the months.`
      }
      table={
        finishes.total > 0 && (
          <ChartTable
            caption="Titles finished per month, last 12 months"
            headers={["Month", "Finished"]}
            rows={columns.map((column) => ({ key: column.key, label: column.name, value: String(column.value) }))}
          />
        )
      }
      className={className}
    >
      {finishes.total > 0 && <ColumnChart label="Titles finished per month" columns={columns} labelPeak />}
    </StatsCard>
  );
}
