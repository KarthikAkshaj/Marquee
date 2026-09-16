import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` from writing generated notes into the project's docs.
  agentRules: false,
  // Dev-only badge; bottom-left sits on top of the sidebar's Sign out button.
  devIndicators: { position: "bottom-right" },
  images: {
    // Cover art hosts (SPEC §7) and Supabase Storage for avatars (SPEC §5).
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "images.igdb.com", pathname: "/igdb/image/upload/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
