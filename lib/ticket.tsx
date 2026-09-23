/**
 * The year's ticket, drawn for `ImageResponse` (Satori, so inline styles and
 * flexbox only) the way lib/brand draws the app icon. Kept out of the route so
 * it can be rendered with made-up numbers while it's being worked on.
 */
import { BRAND } from "@/lib/brand";
import type { Wrapped } from "@/lib/wrapped";

export const TICKET_SIZE = { width: 1200, height: 630 };

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", fontSize: 18, letterSpacing: 5, color: accent, opacity: 0.75 }}>{label}</div>
      <div style={{ display: "flex", fontSize: 62, color: "#EFEAE3" }}>{value}</div>
    </div>
  );
}

export function ticketArt({ wrapped }: { wrapped: Wrapped }) {
  // The year's own colour when there is one, the house amber otherwise.
  const accent = wrapped.accent ?? BRAND.bulb;

  return (
    <div
      style={{
        width: TICKET_SIZE.width,
        height: TICKET_SIZE.height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.ink,
        backgroundImage: `radial-gradient(60% 55% at 50% 0%, ${accent}33, transparent)`,
        fontFamily: "Geist Mono",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: `3px dashed ${accent}`,
          borderRadius: 16,
          padding: "46px 86px",
          background: "rgba(9, 9, 11, 0.72)",
        }}
      >
        <div style={{ display: "flex", fontSize: 46, letterSpacing: 16, color: accent }}>ADMIT ONE</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 20, letterSpacing: 9, color: accent, opacity: 0.8 }}>
          MARQUEE {wrapped.year}
        </div>

        <div style={{ display: "flex", gap: 78, marginTop: 40, paddingTop: 40, borderTop: `2px solid ${accent}66` }}>
          <Stat label="ADDED" value={wrapped.added.toLocaleString()} accent={accent} />
          <Stat label="FINISHED" value={wrapped.finished.toLocaleString()} accent={accent} />
          <Stat label="HOURS" value={wrapped.hours.toLocaleString()} accent={accent} />
        </div>
      </div>

      {wrapped.top && (
        <div style={{ display: "flex", marginTop: 40, fontSize: 22, letterSpacing: 2, color: "#9B938A" }}>
          Best of the year: {wrapped.top.title}
        </div>
      )}
    </div>
  );
}
