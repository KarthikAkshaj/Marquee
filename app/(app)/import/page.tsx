import type { Metadata } from "next";
import { ImportFlow } from "@/components/import/ImportFlow";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { getAllTitles, getCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Import" };

/** Import from a doc (SPEC §8.9). `?category=<slug>` preselects the shelf. */
export default async function ImportPage({ searchParams }: PageProps<"/import">) {
  const [categories, saved, params] = await Promise.all([getCategories(), getAllTitles(), searchParams]);
  const wanted = typeof params.category === "string" ? params.category : null;
  const shelves = categories.map(({ id, name, slug, color, kind, itemCount }) => ({ id, name, slug, color, kind, itemCount }));

  return (
    <>
      <AmbientBackground variant="app" />
      <ImportFlow
        shelves={shelves}
        saved={saved}
        initialShelfId={shelves.find((shelf) => shelf.slug === wanted)?.id ?? null}
      />
    </>
  );
}
