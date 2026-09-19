import { NextResponse, type NextRequest } from "next/server";
import { getAnimeSeries, matchMetadata, searchMetadata, type MatchResponse, type SearchError, type SearchResponse } from "@/lib/search";
import { createRateLimiter } from "@/lib/search/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { matchQuerySchema, relatedQuerySchema, searchQuerySchema } from "@/lib/validators";

/** A 250ms debounce means ~4 requests a second at most; a burst of 30, then one every 2s. */
const limiter = createRateLimiter({ capacity: 30, refillPerSecond: 0.5 });

const STATUS: Partial<Record<SearchError, number>> = {
  signed_out: 401,
  invalid_query: 400,
  rate_limited: 429,
};

function respond(body: SearchResponse) {
  return NextResponse.json(body, {
    status: (body.error && STATUS[body.error]) ?? 200,
    // Results don't depend on who asked, but the endpoint needs a session.
    // Failures aren't kept, so a retry can succeed.
    headers: { "Cache-Control": body.error ? "private, no-store" : "private, max-age=300" },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return respond({ results: [], error: "signed_out" });

  if (request.nextUrl.searchParams.has("related")) {
    const related = relatedQuerySchema.safeParse({
      kind: request.nextUrl.searchParams.get("kind"),
      related: request.nextUrl.searchParams.get("related"),
    });
    if (!related.success) return respond({ results: [], error: "invalid_query" });
    if (!limiter.take(userId)) return respond({ results: [], error: "rate_limited" });
    return respond(await getAnimeSeries(related.data.related));
  }

  const params = searchQuerySchema.safeParse({
    kind: request.nextUrl.searchParams.get("kind"),
    q: request.nextUrl.searchParams.get("q") ?? "",
  });
  if (!params.success) return respond({ results: [], error: "invalid_query" });

  if (!limiter.take(userId)) return respond({ results: [], error: "rate_limited" });

  return respond(await searchMetadata(params.data.kind, params.data.q));
}

/**
 * Candidates for up to 10 titles at once (Find covers). One batch counts as one
 * search against the limit: for anime it's a single upstream request.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const reply = (body: MatchResponse) =>
    NextResponse.json(body, { status: (body.error && STATUS[body.error]) ?? 200, headers: { "Cache-Control": "private, no-store" } });
  if (!userId) return reply({ results: [], error: "signed_out" });

  const params = matchQuerySchema.safeParse(await request.json().catch(() => null));
  if (!params.success) return reply({ results: [], error: "invalid_query" });

  if (!limiter.take(userId)) return reply({ results: [], error: "rate_limited" });

  return reply(await matchMetadata(params.data.kind, params.data.queries));
}
