import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Only the public pages are for search engines (SPEC §11). Everything behind
 * sign-in is off limits, on top of the `noindex` the `(app)` layout sets.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/c/", "/import", "/settings", "/auth/", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
