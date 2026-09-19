import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/** Installable on phones and desktops (SPEC §11 PWA): opens on Home, full screen, on the dark stage. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/home",
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: BRAND.ink,
    theme_color: BRAND.ink,
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
