import type { Metadata } from "next";
import { CategoryBrowser } from "@/components/category/CategoryBrowser";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { getCategories, getCategoryBySlug, getCategoryItems } from "@/lib/queries";

export async function generateMetadata({ params }: LayoutProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category.name };
}

/**
 * A category shelf (SPEC §8.5). It's drawn by a layout, and the page under it
 * is empty, on purpose: Next keys a page by its whole address, `?item=` and
 * the tabs included, so a save made with a title open (which refreshes the
 * route) used to find a "different" page, throw the shelf away and build it
 * again, jumping it to the top. A layout is keyed by the shelf alone, so it
 * stays put and just takes the fresh titles. Tab, view, sort, favourites and
 * the open title (§8.6) are read from the URL in the browser.
 */
export default async function ShelfLayout({ params, children }: LayoutProps<"/c/[slug]">) {
  const { slug } = await params;
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
        items={items}
      />
      {children}
    </>
  );
}
