import { NextResponse, type NextRequest } from "next/server";
import { searchMetadata, type SearchError, type SearchResponse } from "@/lib/search";
import { createRateLimiter } from "@/lib/search/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validators";

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

  const params = searchQuerySchema.safeParse({
    kind: request.nextUrl.searchParams.get("kind"),
    q: request.nextUrl.searchParams.get("q") ?? "",
  });
  if (!params.success) return respond({ results: [], error: "invalid_query" });

  if (!limiter.take(userId)) return respond({ results: [], error: "rate_limited" });

  return respond(await searchMetadata(params.data.kind, params.data.q));
}
