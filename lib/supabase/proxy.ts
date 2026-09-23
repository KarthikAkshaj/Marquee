import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { noncePolicy, staticPolicy } from "@/lib/security";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Everything under the (app) route group needs a session. */
const PROTECTED_PREFIXES = ["/home", "/c", "/import", "/settings", "/wrapped"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Which pages Next renders on the spot, and so can be handed a nonce. The rest
 * (landing, legal, 404) are prerendered at build time. Keep this in step with
 * the build's list of dynamic routes.
 */
function rendersPerRequest(pathname: string) {
  return isProtected(pathname) || pathname === "/login" || pathname.startsWith("/auth/callback") || pathname.startsWith("/api/");
}

/**
 * Refreshes the Supabase session cookie on every request and guards routes
 * (SPEC §6). This is a convenience, not the security boundary — RLS is.
 * Server Actions are POSTs to their own route and can slip past a matcher,
 * so actions re-check auth themselves.
 */
export async function updateSession(request: NextRequest) {
  // A fresh nonce per request; Next reads it back out of the policy and puts it on its scripts.
  // Only for pages rendered per request: a prerendered page was built without one.
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const perRequest = rendersPerRequest(request.nextUrl.pathname);
  const policy = perRequest ? noncePolicy(nonce) : staticPolicy();
  const requestHeaders = new Headers(request.headers);
  if (perRequest) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", policy);
  }
  const next = () => {
    const created = NextResponse.next({ request: { headers: requestHeaders } });
    created.headers.set("content-security-policy", policy);
    return created;
  };

  let response = next();

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
          response = next();
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
  const policy = response.headers.get("content-security-policy");
  if (policy) redirect.headers.set("content-security-policy", policy);
  return redirect;
}
