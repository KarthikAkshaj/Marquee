import { NextResponse } from "next/server";
import { getDismissedPicks, getTasteItems } from "@/lib/queries";
import { backlogPicks, knowsTaste, tasteOf } from "@/lib/recommend";
import { surpriseWeight, type SurprisePool } from "@/lib/surprise";
import { createClient } from "@/lib/supabase/server";

type SurpriseReply = SurprisePool & { error?: "signed_out" | "unavailable" };

function reply(body: SurpriseReply, status = 200) {
  // Built from the viewer's own shelves: never cached by anyone else.
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

const EMPTY = { titles: [], personal: false };

/**
 * Surprise me's reel (SPEC §10): every planned title, each with the reason it
 * might suit you and how much the spin leans to it. Worked out here from the
 * whole library, so a big one never goes to the phone; only the planned
 * titles do. Asked for each time Surprise me opens, so it's never stale.
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return reply({ ...EMPTY, error: "signed_out" }, 401);

  try {
    const [library, dismissed] = await Promise.all([getTasteItems(), getDismissedPicks()]);
    // Same taste as Home's "Picked for you" and For you, so the three agree.
    const taste = tasteOf(library, { dismissed: dismissed.about });
    const titles = backlogPicks(library, taste).map(({ item, reason, score }) => ({
      id: item.id,
      title: item.title,
      category_id: item.category_id,
      year: item.year,
      cover_url: item.cover_url,
      accent_color: item.accent_color,
      format: item.format,
      genres: item.genres,
      runtime_minutes: item.runtime_minutes,
      progress_total: item.progress_total,
      reason,
      weight: surpriseWeight(score),
    }));
    return reply({ titles, personal: knowsTaste(taste) });
  } catch {
    return reply({ ...EMPTY, error: "unavailable" }, 500);
  }
}
