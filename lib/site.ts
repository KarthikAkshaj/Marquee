/** The app's public origin, for links in emails and OAuth redirects (SPEC §12). */
export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
