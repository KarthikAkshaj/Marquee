/**
 * The welcome on arrival (U25). Sign-ins that come back through
 * /auth/callback (Google, the email's magic link) carry `welcome=1`; the
 * callback turns it into this short-lived cookie once the session is real,
 * and the app stamps ADMIT ONE the first time it sees it, then clears it.
 * Email-change confirmations use the same callback without the flag, so they
 * arrive quietly. A code typed on the sign-in page stamps there instead.
 */
export const WELCOME_COOKIE = "marquee-welcome";

/** Long enough to survive the redirect, short enough never to greet a later visit. */
export const WELCOME_MAX_AGE = 60;

/** Where a sign-in comes back to: the callback, with where to go next and the welcome flag. */
export function signInCallback(origin: string, next: string) {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}&welcome=1`;
}

/** Whether a cookie header string (document.cookie) holds the welcome. */
export function hasWelcome(cookies: string) {
  return cookies.split(/;\s*/).includes(`${WELCOME_COOKIE}=1`);
}
