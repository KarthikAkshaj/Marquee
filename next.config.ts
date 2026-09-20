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
      // Google sign-in fills avatar_url with the account photo until one is uploaded.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  /**
   * Sent with every response. The Content-Security-Policy is separate: it's
   * built per request in `proxy.ts`, because it carries a nonce.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Two years of HTTPS only. Vercel redirects anyway; this stops the first plain request.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Older browsers that don't read frame-ancestors.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
