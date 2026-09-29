import type { Metadata } from "next";
import { StatsBrowser } from "@/components/stats/StatsBrowser";
import { getCategories, getStatsItems } from "@/lib/queries";
import { wrappedYear } from "@/lib/wrapped";

export const metadata: Metadata = { title: "Stats" };

/** Your numbers (SPEC §10): every title counted, optionally one shelf at a time (`?shelf=anime`). */
export default async function StatsPage() {
  const [categories, items] = await Promise.all([getCategories(), getStatsItems()]);
  const shelves = categories.map(({ id, name, slug, kind, color }) => ({ id, name, slug, kind, color }));

  return <StatsBrowser shelves={shelves} items={items} today={new Date().toISOString()} wrappedYear={wrappedYear()} />;
}
