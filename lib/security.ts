/**
 * The Content-Security-Policy (SPEC §13), built per request in `proxy.ts`.
 *
 * Pages rendered per request carry a nonce, which is the strong version: only
 * scripts Next itself put on the page can run. Prerendered pages (the landing,
 * the legal pages, the 404) are built once, long before the request, so there
 * is no nonce to give them and they fall back to allowing inline scripts. They
 * hold no account data, and both versions still refuse scripts from anywhere
 * but this origin.
 */
import { CAPTCHA_HOSTS } from "@/lib/captcha";

// Turnstile runs on the login page: its script, its challenge frame and its own calls.
const captcha = CAPTCHA_HOSTS.join(" ");

const COMMON = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Nobody frames Marquee, and Marquee frames nobody.
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Inline styles: the accent colour of a cover, and what Next injects.
  "style-src 'self' 'unsafe-inline'",
  // Cover art hosts (SPEC §7), avatars in Supabase Storage, the Google account photo,
  // plus blob:/data: for the avatar crop preview and generated covers.
  "img-src 'self' data: blob: https://image.tmdb.org https://s4.anilist.co https://images.igdb.com https://*.supabase.co https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  `frame-src ${captcha}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'none'",
];

// `next dev` needs eval and a websocket for hot reload; a blocked dev overlay helps nobody.
const development = () => process.env.NODE_ENV !== "production";
const connect = () => `connect-src 'self' https://*.supabase.co ${captcha}${development() ? " ws: http://localhost:*" : ""}`;
// Any stray http:// subresource gets fetched over https instead. Left out locally,
// where the site is plain http and the upgrade would break every prefetch.
const upgrade = () => (development() ? [] : ["upgrade-insecure-requests"]);

/** For a page rendered per request: only Next's own nonced scripts, and what they load. */
export function noncePolicy(nonce: string): string {
  return [
    ...COMMON,
    ...upgrade(),
    connect(),
    // 'strict-dynamic': scripts the nonced bootstrap loads are trusted too. It
    // also makes the host below moot, except to a browser too old to know it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${captcha}${development() ? " 'unsafe-eval'" : ""}`,
  ].join("; ");
}

/**
 * For a prerendered page: scripts from this origin only, inline included.
 *
 * A policy belongs to the document, not the route, so this one rides a soft
 * navigation into pages that asked for the nonce. The links into sign-in are
 * plain anchors to stop that, but proxy.ts can still bounce a stale signed-out
 * tab to /login without a reload, so the captcha host has to be here as well.
 */
export function staticPolicy(): string {
  return [...COMMON, ...upgrade(), connect(), `script-src 'self' 'unsafe-inline' ${captcha}${development() ? " 'unsafe-eval'" : ""}`].join("; ");
}
