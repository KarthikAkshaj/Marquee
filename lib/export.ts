import type { Database } from "@/lib/supabase/database.types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

type ExportProfile = Pick<Row<"profiles">, "username" | "display_name" | "bio" | "avatar_url" | "created_at">;
type ExportItem = Omit<Row<"items">, "user_id" | "category_id">;
type ExportCategory = Omit<Row<"categories">, "user_id"> & { items: ExportItem[] };

export type MarqueeExport = {
  app: "marquee";
  version: 1;
  exportedAt: string;
  profile: ExportProfile;
  categories: ExportCategory[];
};

function exportItem(item: Row<"items">): ExportItem {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    rating: item.rating,
    progress_current: item.progress_current,
    progress_total: item.progress_total,
    notes: item.notes,
    is_favorite: item.is_favorite,
    year: item.year,
    started_at: item.started_at,
    finished_at: item.finished_at,
    cover_url: item.cover_url,
    backdrop_url: item.backdrop_url,
    accent_color: item.accent_color,
    genres: item.genres,
    community_score: item.community_score,
    source: item.source,
    external_id: item.external_id,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * Everything a user owns as one JSON document (SPEC §8.10 Data): each category
 * with its titles nested inside, in sidebar order. Account ids are left out.
 */
export function buildExport(
  profile: ExportProfile,
  categories: Row<"categories">[],
  items: Row<"items">[],
  now = new Date(),
): MarqueeExport {
  return {
    app: "marquee",
    version: 1,
    exportedAt: now.toISOString(),
    profile,
    categories: [...categories]
      .sort((a, b) => a.position - b.position)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        kind: category.kind,
        color: category.color,
        icon: category.icon,
        position: category.position,
        created_at: category.created_at,
        items: items.filter((item) => item.category_id === category.id).map(exportItem),
      })),
  };
}

/** "marquee-void_flux-2026-09-17.json" */
export function exportFileName(username: string, now = new Date()) {
  return `marquee-${username}-${now.toISOString().slice(0, 10)}.json`;
}
