import type { Metadata } from "next";
import { CategoryBrowser } from "@/components/category/CategoryBrowser";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { parseCategoryParams } from "@/lib/items";
import { getCategories, getCategoryBySlug, getCategoryItems } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category.name };
}

/** A category shelf (SPEC §8.5). Tab, view, sort, favourites and the open title (§8.6) come from the URL. */
export default async function CategoryPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const [{ slug }, rawSearch] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  const [items, categories] = await Promise.all([getCategoryItems(category.id), getCategories()]);

  return (
    <>
      <AmbientBackground variant="category" color={category.color} />
      <CategoryBrowser
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          kind: category.kind,
          color: category.color,
        }}
        categories={categories.map(({ id, name, slug, color }) => ({ id, name, slug, color }))}
        params={parseCategoryParams(rawSearch)}
        items={items}
      />
    </>
  );
}
