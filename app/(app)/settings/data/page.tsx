import type { Metadata } from "next";
import Link from "next/link";
import { DataExport } from "@/components/settings/DataExport";
import { getCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Data" };

/** Your data out (JSON, or one shelf as CSV) and the way in (Import) (SPEC §8.10). */
export default async function DataSettingsPage() {
  const categories = await getCategories();
  const titleCount = categories.reduce((sum, category) => sum + category.itemCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <DataExport
        shelves={categories.map(({ id, name, color, itemCount }) => ({ id, name, color, itemCount }))}
        titleCount={titleCount}
      />
      <Link
        href="/import"
        className="group flex items-center gap-3.5 rounded-[11px] border border-border bg-white/2 px-4.5 py-4 transition-colors hover:border-accent/35"
      >
        <span aria-hidden className="size-2.25 shrink-0 rounded-full bg-accent shadow-mark-xs" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium">Coming from somewhere else?</span>
          <span className="mt-0.75 block text-12 text-text-muted">Bring in a list from Word, Notion, a spreadsheet, MyAnimeList or a Marquee backup, checked over before anything is saved.</span>
        </span>
        <span className="shrink-0 text-13 text-accent transition-colors group-hover:text-accent-bright">
          Go to Import <span aria-hidden>→</span>
        </span>
      </Link>
    </div>
  );
}
