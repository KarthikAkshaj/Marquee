import type { Metadata } from "next";
import { StatsView } from "@/components/stats/StatsView";
import { getCategories, getStatsItems } from "@/lib/queries";
import { pickShelf } from "@/lib/stats";
import { wrappedYear } from "@/lib/wrapped";

export const metadata: Metadata = { title: "Stats" };

/** Your numbers (SPEC §10): every title counted, optionally one shelf at a time (`?shelf=anime`). */
export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const [categories, items, { shelf: slug }] = await Promise.all([getCategories(), getStatsItems(), searchParams]);
  const shelves = categories.map(({ id, name, slug, kind, color }) => ({ id, name, slug, kind, color }));

  return (
    <StatsView
      shelves={shelves}
      shelf={pickShelf(shelves, typeof slug === "string" ? slug : undefined)}
      items={items}
      today={new Date()}
      wrappedYear={wrappedYear()}
    />
  );
}
