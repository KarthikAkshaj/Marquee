import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validators";

/**
 * Magic links, OAuth and email-change confirmations land here (SPEC §6, §8.10).
 * A one-time `code` is exchanged for session cookies, then the user goes on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return noStore(NextResponse.redirect(new URL(next, origin)));
    }
  }

  // Secure email change needs a click in both inboxes. The first click carries
  // a message instead of a code; the second finishes the change.
  if (!code && searchParams.get("message") && !searchParams.get("error")) {
    const destination = new URL(next, origin);
    destination.searchParams.set("notice", "email-half-confirmed");
    return noStore(NextResponse.redirect(destination));
  }

  return noStore(NextResponse.redirect(new URL("/auth/auth-code-error", origin)));
}

/** Responses that set auth cookies must never be cached. */
function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
