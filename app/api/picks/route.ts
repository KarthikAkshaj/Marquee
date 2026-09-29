import { NextResponse, type NextRequest } from "next/server";
import { cleanMoodWord, readMood } from "@/lib/moods";
import { loadPickContext, moodPicksFor, recommendedPicks } from "@/lib/picks";
import type { PicksPayload } from "@/lib/recommend";
import { createRateLimiter } from "@/lib/search/rate-limit";
import { createClient } from "@/lib/supabase/server";

/** Tapping through every mood is nine requests; a burst of 20, then one every 2s. */
const limiter = createRateLimiter({ capacity: 20, refillPerSecond: 0.5 });

type PicksReply = PicksPayload & { error?: "signed_out" | "invalid_mood" | "rate_limited" };

function reply(body: PicksReply, status = 200) {
  // Built from the viewer's own shelves: never cached by anyone else.
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

const EMPTY = { picks: [], notices: {} };

/**
 * For you's "New to you" for a mood (SPEC §20), asked for by the mood chips
 * so switching needs no page load. `?mood=` is a mood's slug or a typed word;
 * without it, the usual picks.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return reply({ ...EMPTY, error: "signed_out" }, 401);

  const raw = request.nextUrl.searchParams.get("mood");
  if (raw !== null && raw !== "" && !cleanMoodWord(raw)) return reply({ ...EMPTY, error: "invalid_mood" }, 400);
  if (!limiter.take(userId)) return reply({ ...EMPTY, error: "rate_limited" }, 429);

  const choice = readMood(raw);
  const context = await loadPickContext();
  return reply(choice ? await moodPicksFor(context, choice) : await recommendedPicks(context));
}
