import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Everything under the (app) route group needs a session. */
const PROTECTED_PREFIXES = ["/home", "/c", "/import", "/settings"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every request and guards routes
 * (SPEC §6). This is a convenience, not the security boundary — RLS is.
 * Server Actions are POSTs to their own route and can slip past a matcher,
 * so actions re-check auth themselves.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Without these, a CDN could cache a response carrying someone's
          // session cookie and hand it to the next visitor.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // getClaims() revalidates the token; getSession() alone is not trustworthy
  // on the server.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname, searchParams } = request.nextUrl;

  if (!signedIn && isProtected(pathname)) {
    return redirectPreservingSession(request, response, "/login", pathname);
  }

  // Signed-in users have no use for the landing page or the login form —
  // unless they deliberately asked to switch account (SPEC §6).
  const switchingAccount = searchParams.get("switch") === "1";
  if (signedIn && !switchingAccount && (pathname === "/" || pathname === "/login")) {
    return redirectPreservingSession(request, response, "/home");
  }

  return response;
}

function redirectPreservingSession(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  next?: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next && next !== "/home") url.searchParams.set("next", next);

  const redirect = NextResponse.redirect(url);
  // Carry over any cookies the refresh just issued, or we throw the new
  // session away and bounce the user around.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}
