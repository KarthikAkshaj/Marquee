import { StepDots } from "./StepDots";

const COPY = {
  source: {
    title: (
      <>
        Bring the <em className="text-accent">list</em> in.
      </>
    ),
    line: "Paste it, or drop the Word file. One title per line is all we need.",
    step: 1,
  },
  review: {
    title: "Check the marquee.",
    line: "Titles are editable. Untick anything you didn't mean to keep.",
    step: 2,
  },
  done: {
    title: (
      <>
        That&apos;s the <em className="text-accent">list</em> in.
      </>
    ),
    line: "Everything you ticked is on the shelf now.",
    step: 2,
  },
} as const;

/** The import page's heading and step dots (handoff §05). */
export function ImportHeader({ step }: { step: keyof typeof COPY }) {
  const copy = COPY[step];
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div>
        {step === "source" && <p className="mb-2.25 font-mono text-[10px] tracking-[.14em] text-text-muted md:text-[11px]">IMPORT</p>}
        <h1 className="font-display text-[34px] leading-[1.05] md:text-[46px] md:leading-none">{copy.title}</h1>
        <p className="mt-2.5 text-[13.5px] text-text-muted md:text-14">{copy.line}</p>
      </div>
      <div className="hidden pb-1 md:block">
        <StepDots active={copy.step} />
      </div>
    </header>
  );
}
