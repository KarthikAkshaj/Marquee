type ChartTableProps = {
  caption: string;
  headers: [string, string];
  rows: { key: string; label: string; value: string }[];
};

/** Every number a chart draws, as text: for screen readers, and anyone who'd rather read than hover. */
export function ChartTable({ caption, headers, rows }: ChartTableProps) {
  return (
    <details className="group mt-3">
      <summary className="flex min-h-11 w-fit cursor-pointer items-center text-12 text-text-muted transition-colors hover:text-text md:min-h-0">
        <span className="group-open:hidden">Show as a table</span>
        <span className="hidden group-open:inline">Hide the table</span>
      </summary>
      <table className="mt-2 w-full max-w-100 text-13">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-white/8 text-left">
            <th scope="col" className="py-1.5 font-mono text-[10.5px] font-normal tracking-[.1em] text-text-muted uppercase">
              {headers[0]}
            </th>
            <th scope="col" className="py-1.5 text-right font-mono text-[10.5px] font-normal tracking-[.1em] text-text-muted uppercase">
              {headers[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-white/5 last:border-0">
              <th scope="row" className="py-1.5 text-left font-normal text-text">
                {row.label}
              </th>
              <td className="py-1.5 text-right font-mono text-text">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
