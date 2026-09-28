import { ImageResponse } from "next/og";
import { BRAND, iconArt } from "@/lib/brand";
import { drawablePhoto, photoHosts } from "@/lib/og-photo";
import { publicStats } from "@/lib/public-profile";
import { getPublicProfile } from "@/lib/queries";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { initials } from "@/lib/user";

export const alt = "A shelf of favourites on Marquee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * A Google font, fetched just for the letters the card draws. Satori can't
 * read woff2, and Google sends TrueType to a request with no browser in it.
 * Without it the card still renders, in Satori's own face.
 */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

const BULBS = 22;

/**
 * The link preview for a public profile (SPEC §19): a marquee sign with the
 * photo, name, @username and what's on show. A private or missing profile
 * gets the plain Marquee card, so a preview can't reveal who exists.
 */
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  const name = profile ? (profile.display_name ?? profile.username) : BRAND.name;
  const stats = profile ? publicStats(profile) : null;
  const shelves = profile?.shelves.slice(0, 4).map((shelf) => shelf.name) ?? [];
  const bio = profile?.bio && profile.bio.length > 110 ? `${profile.bio.slice(0, 107)}...` : (profile?.bio ?? null);
  const footer = stats ? `${stats.totalTitles} ${stats.totalTitles === 1 ? "title" : "titles"} on show` : "";
  const line = profile ? bio : BRAND.description;
  const monogram = initials(name);

  const [display, sans, photo] = await Promise.all([
    googleFont("Fraunces", 420, `${name}${monogram}`),
    googleFont("Geist", 400, `@${profile?.username ?? ""}${line ?? ""}${shelves.join("")}${footer}`),
    drawablePhoto(profile?.avatar_url ?? null, photoHosts(SUPABASE_URL)),
  ]);
  const fonts = [
    ...(sans ? [{ name: "Geist", data: sans, weight: 400 as const, style: "normal" as const }] : []),
    ...(display ? [{ name: "Fraunces", data: display, weight: 400 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(circle at 18% 12%, ${BRAND.bulb}38, transparent 46%), radial-gradient(circle at 92% 20%, ${BRAND.crimson}30, transparent 40%), ${BRAND.ink}`,
          color: BRAND.paper,
          fontFamily: sans ? "Geist" : undefined,
          padding: "56px 72px",
        }}
      >
        {/* The bulbs across the top of the sign. */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 44 }}>
          {Array.from({ length: BULBS }, (_, index) => (
            <div
              key={index}
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: index % 2 === 0 ? BRAND.bulb : `${BRAND.bulb}66`,
                boxShadow: index % 2 === 0 ? `0 0 16px ${BRAND.bulb}` : "none",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48, flex: 1 }}>
          {profile ? (
            <div style={{ display: "flex", padding: 6, borderRadius: 999, background: `linear-gradient(135deg, ${BRAND.glow}, ${BRAND.bulb}, ${BRAND.ember})` }}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain img only.
                <img src={photo} width={200} height={200} alt="" style={{ borderRadius: 999, border: `6px solid ${BRAND.ink}`, objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: 200,
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    border: `6px solid ${BRAND.ink}`,
                    background: `linear-gradient(145deg, ${BRAND.glow}, ${BRAND.bulb} 56%, ${BRAND.ember})`,
                    color: BRAND.ink,
                    fontFamily: display ? "Fraunces" : undefined,
                    fontSize: 84,
                  }}
                >
                  {monogram}
                </div>
              )}
            </div>
          ) : (
            iconArt({ size: 180, mark: 0.5, radius: 0.24 })
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: display ? "Fraunces" : undefined, fontSize: name.length > 18 ? 64 : 80, lineHeight: 1.05, letterSpacing: -1 }}>
              {name}
            </div>
            {/* One text node: Satori wants display:flex on anything holding two. */}
            {profile && <div style={{ marginTop: 14, fontSize: 30, color: BRAND.bulb }}>{`@${profile.username}`}</div>}
            {line && <div style={{ marginTop: 18, fontSize: 27, lineHeight: 1.4, color: BRAND.mist, maxWidth: 760 }}>{line}</div>}
          </div>
        </div>

        {profile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", gap: 12 }}>
              {shelves.map((shelf) => (
                <div key={shelf} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, border: `2px solid ${BRAND.paper}22`, background: BRAND.stage, fontSize: 22 }}>
                  {shelf}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 24, color: BRAND.mist }}>
              {footer}
              {iconArt({ size: 52, mark: 0.5, radius: 0.24 })}
            </div>
          </div>
        )}
      </div>
    ),
    { ...size, fonts },
  );
}
