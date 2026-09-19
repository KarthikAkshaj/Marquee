import type { ItemStatus } from "@/lib/status";
import { entryLine, statusFromWord } from "./table";

/** Older exports number the statuses; 3 is On-Hold, which Marquee keeps as in progress. */
const NUMBERED: Record<string, ItemStatus> = { "1": "in_progress", "2": "completed", "3": "in_progress", "4": "dropped", "6": "planned" };

function field(entry: Element, name: string): string {
  return entry.getElementsByTagName(name)[0]?.textContent?.trim() ?? "";
}

/**
 * A MyAnimeList export (also what Kitsu and AniList export tools write) as
 * lines for the paste box: each anime or manga with its list status. Null when
 * the XML isn't one.
 */
export function malToText(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return null;
  const entries = [...Array.from(doc.getElementsByTagName("anime")), ...Array.from(doc.getElementsByTagName("manga"))];
  const lines = entries.flatMap((entry) => {
    const title = field(entry, "series_title") || field(entry, "manga_title");
    const status = field(entry, "my_status");
    return title ? [entryLine({ title, status: NUMBERED[status] ?? statusFromWord(status), year: null })] : [];
  });
  return lines.length ? lines.join("\n") : null;
}
