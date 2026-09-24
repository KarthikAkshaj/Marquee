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
    runtime_minutes: item.runtime_minutes,
    format: item.format,
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

/** "marquee-anime-2026-09-19.csv" */
export function csvFileName(slug: string, now = new Date()) {
  return `marquee-${slug}-${now.toISOString().slice(0, 10)}.csv`;
}

const SOURCE_LABELS: Record<Row<"items">["source"], string> = { manual: "Added by hand", anilist: "AniList", tmdb: "TMDB", igdb: "IGDB" };

/** Starts a formula in a spreadsheet; such text gets a leading apostrophe so it stays text. */
const FORMULA_START = new Set(["=", "+", "-", "@", String.fromCharCode(9), String.fromCharCode(13)]);
const NEEDS_QUOTES = /[",\n\r]/;

/** One CSV cell (RFC 4180): quoted when it holds a comma, quote or line break. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === false) return "";
  if (value === true) return "yes";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.has(text.charAt(0))) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const CSV_COLUMNS = ["Title", "Status", "Progress", "Total", "Rating", "Favourite", "Released", "Started", "Finished", "Genres", "Community score", "Source", "Notes", "Added", "Updated"];

/**
 * One shelf as a spreadsheet-friendly CSV (SPEC §8.10 Data): status in the
 * shelf's own words ("Watched", "Backlog"), dates as YYYY-MM-DD. It starts with
 * a byte-order mark so Excel reads Japanese or accented titles correctly.
 */
export function buildCategoryCsv(labels: Record<Row<"items">["status"], string>, items: Row<"items">[]): string {
  const day = (value: string | null) => value?.slice(0, 10) ?? null;
  const rows = items.map((item) =>
    [
      item.title,
      labels[item.status],
      item.progress_current || null,
      item.progress_total,
      item.rating,
      item.is_favorite,
      item.year,
      day(item.started_at),
      day(item.finished_at),
      item.genres.join("; "),
      item.community_score,
      SOURCE_LABELS[item.source],
      item.notes,
      day(item.created_at),
      day(item.updated_at),
    ]
      .map(csvCell)
      .join(","),
  );
  return String.fromCharCode(0xfeff) + [CSV_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}
