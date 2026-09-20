import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** The three pages anyone can read: the landing and the two legal pages (SPEC §11). */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  return [
    { url: origin, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
