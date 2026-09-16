import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validators";

/**
 * Magic links and OAuth both land here with a one-time `code` (SPEC §6).
 * Exchanging it sets the session cookies, then we send the user on.
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

  return noStore(NextResponse.redirect(new URL("/auth/auth-code-error", origin)));
}

/** Responses that set auth cookies must never be cached. */
function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
