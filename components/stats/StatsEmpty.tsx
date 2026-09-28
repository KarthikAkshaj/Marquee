import { StartAdding } from "@/components/home/StartAdding";
import { AmbientBackground } from "@/components/shell/AmbientBackground";

/** Nothing tracked yet: one serif line, one sentence, one action (SPEC §9.5). */
export function StatsEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <AmbientBackground variant="empty" />
      <h1 className="font-display text-[40px] leading-[1.05] md:text-[50px]">
        Nothing to <em className="text-accent">count</em> yet.
      </h1>
      <p className="mt-3.5 max-w-100 text-[15px] leading-[1.6] text-pretty text-text-muted">
        Add a few titles and the numbers show up here, charts and all.
      </p>
      <div className="mt-5.5">
        <StartAdding />
      </div>
    </div>
  );
}
