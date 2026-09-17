import type { Metadata } from "next";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { getCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Categories" };

/** Rename, retype, recolour, reorder, add and delete categories (SPEC §8.10). */
export default async function CategoriesSettingsPage() {
  const categories = await getCategories();
  return <CategoryManager categories={categories} />;
}
