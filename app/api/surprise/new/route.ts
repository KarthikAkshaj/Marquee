import { NextResponse, type NextRequest } from "next/server";
import { LENGTHS } from "@/lib/lengths";
import { MOODS } from "@/lib/moods";
import { loadPickContext, newSurprisesFor, type NewSurprisePayload } from "@/lib/picks";
import { createRateLimiter } from "@/lib/search/rate-limit";
import { createClient } from "@/lib/supabase/server";

/** Each new combination asks the providers; a burst of 20, then one every 2s, like For you's moods. */
const limiter = createRateLimiter({ capacity: 20, refillPerSecond: 0.5 });

type Reply = NewSurprisePayload & { error?: "signed_out" | "invalid" | "rate_limited" };

function reply(body: Reply, status = 200) {
  // Built from the viewer's own shelves: never cached by anyone else.
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

const EMPTY = { titles: [], notices: [] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Surprise me's "Something new" (SPEC §10): titles from outside your shelves
 * for `?length=` and `?mood=` (their slugs, or left out for any), on `?shelf=`
 * or every shelf a provider fills.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return reply({ ...EMPTY, error: "signed_out" }, 401);

  const params = request.nextUrl.searchParams;
  const shelf = params.get("shelf") || null;
  const length = params.get("length") || null;
  const mood = params.get("mood") || null;
  const knownLength = LENGTHS.find((entry) => entry.slug === length);
  const knownMood = MOODS.find((entry) => entry.slug === mood);
  if ((shelf && !UUID.test(shelf)) || (length && !knownLength) || (mood && !knownMood)) {
    return reply({ ...EMPTY, error: "invalid" }, 400);
  }
  if (!limiter.take(userId)) return reply({ ...EMPTY, error: "rate_limited" }, 429);

  const context = await loadPickContext();
  return reply(await newSurprisesFor(context, { shelf, length: knownLength?.slug ?? null, mood: knownMood ?? null }));
}
