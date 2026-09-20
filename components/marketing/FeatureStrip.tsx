import type { ReactNode } from "react";

type Feature = { title: string; body: string; short: string; icon: ReactNode };

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      {children}
    </svg>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Track everything",
    body: "Anime, films, series and games. Every status, every category.",
    short: "Every status, every category.",
    icon: (
      <Icon>
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="15" y2="12" />
        <line x1="4" y1="17" x2="11" y2="17" />
      </Icon>
    ),
  },
  {
    title: "Covers auto-filled",
    body: "Type three letters. The art, year and episode count show up on their own.",
    short: "Type three letters.",
    icon: (
      <Icon>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <circle cx="9.5" cy="9.5" r="1.6" />
        <polyline points="5 17 10 12 14 15 19 10" />
      </Icon>
    ),
  },
  {
    title: "Import your old lists",
    body: "Paste the Word doc, the Notes app, the napkin. Marquee untangles it.",
    short: "Paste the Word doc.",
    icon: (
      <Icon>
        <polyline points="12 3 12 14" />
        <polyline points="7.5 9.5 12 14 16.5 9.5" />
        <polyline points="4.5 17.5 4.5 20.5 19.5 20.5 19.5 17.5" />
      </Icon>
    ),
  },
];

/** Three rows on phones, three columns from md up (handoff §05, §07). */
export function FeatureStrip() {
  return (
    <section
      id="features"
      aria-label="What Marquee does"
      className="relative z-8 border-t border-border bg-sunken"
    >
      <ul className="grid md:grid-cols-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex items-center gap-3.25 border-b border-white/5 px-5 py-3.5 md:items-start md:gap-4 md:border-r md:border-b-0 md:border-white/6 md:px-10 md:pt-8.5 md:pb-9"
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-nav border border-border bg-tile md:size-9.5 md:rounded-[9px]">
              {feature.icon}
            </span>
            <span>
              <span className="block text-[13.5px] font-medium md:text-[15px]">{feature.title}</span>
              <span className="mt-0.5 block text-12 text-text-muted md:hidden">{feature.short}</span>
              <span className="mt-1.5 hidden text-[13.5px] leading-normal text-pretty text-text-muted md:block">
                {feature.body}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
