import { BrandMark } from "@/components/shell/BrandMark";
import { posterGradient, type PosterTone } from "@/lib/poster-art";

const LISTS = [
  { name: "Anime", count: 124, dot: "bg-cat-crimson" },
  { name: "Movies", count: 212, dot: "bg-cat-amber" },
  { name: "Series", count: 38, dot: "bg-cat-violet" },
  { name: "Games", count: 57, dot: "bg-cat-teal" },
];

const CONTINUE: { title: string; progress: string; pct: string; tone: PosterTone }[] = [
  { title: "Vermilion Bell", progress: "07 / 24", pct: "29%", tone: "crimson" },
  { title: "Mourning Fields", progress: "03 / 05", pct: "60%", tone: "teal" },
  { title: "Copper Hollow", progress: "05 / 08", pct: "62%", tone: "violet" },
];

const FINISHED: PosterTone[] = ["ember", "steel", "teal", "rose", "moss", "dust", "crimson"];

/**
 * The tilted Home screen on the landing page (SPEC §8.1). Invented titles and
 * gradient covers only. The greeting says "you" — no made-up user names.
 */
export function HomeMockup() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-49 left-[max(600px,calc(100%-842px))] z-8 hidden w-240 perspective-[1700px] xl:block"
    >
      <div className="glow-amber-mockup absolute inset-[40px_90px_60px_40px] blur-[60px]" />
      <div className="relative flex h-140 origin-left overflow-hidden rounded-tile border border-white/11 bg-bg shadow-mockup [transform:rotateY(-19deg)_rotateX(6deg)_rotate(1.5deg)]">
        <div className="flex w-37.5 flex-none flex-col gap-3.5 border-r border-border bg-bg/70 px-3.5 py-4">
          <BrandMark variant="mockup" />
          <div className="flex flex-col gap-2.25">
            <span className="font-mono text-[8px] tracking-[.14em] text-text-muted">LISTS</span>
            {LISTS.map((list) => (
              <div key={list.name} className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${list.dot}`} />
                <span className="flex-1 text-[10.5px]">{list.name}</span>
                <span className="font-mono text-[9px] text-text-muted">{list.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 px-5.5 py-5">
          <div>
            <p className="font-mono text-[8.5px] tracking-[.14em] text-text-muted">
              TUE 16 SEP · 21:40
            </p>
            <p className="font-display opsz-120 mt-1.75 text-[34px] leading-[1.05]">
              Evening, <em className="text-accent">you.</em>
            </p>
          </div>

          <p className="font-mono text-[8.5px] tracking-[.14em] text-text-muted">CONTINUE</p>
          <div className="flex gap-3">
            {CONTINUE.map((item) => (
              <div
                key={item.title}
                className="flex flex-1 gap-2.5 rounded-[9px] border border-border bg-surface p-2.25"
              >
                <div
                  className="h-17.5 w-12 flex-none rounded-[5px]"
                  style={{ background: posterGradient(item.tone) }}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[11px] leading-[1.25] font-medium">{item.title}</p>
                  <p className="mt-0.75 font-mono text-[9px] text-text-muted">{item.progress}</p>
                  <div className="mt-auto h-0.75 overflow-hidden rounded-[2px] bg-white/10">
                    <div className="h-full bg-accent" style={{ width: item.pct }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="font-mono text-[8.5px] tracking-[.14em] text-text-muted">
            RECENTLY FINISHED
          </p>
          <div className="flex gap-3">
            {FINISHED.map((tone, index) => (
              <div
                key={index}
                className="h-37.5 w-25 flex-none rounded-[7px]"
                style={{ background: posterGradient(tone) }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
