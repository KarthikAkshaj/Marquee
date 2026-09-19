import type { ReactNode } from "react";

/** One titled part of a legal page; lists, links and bold words are styled for reading. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[17px] font-medium text-text">{title}</h2>
      <div className="flex flex-col gap-3 text-[14.5px] leading-[1.7] text-pretty text-text-muted [&_a]:text-accent [&_a]:underline [&_a]:decoration-accent/45 [&_a]:underline-offset-3 [&_a:hover]:decoration-accent [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-text [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
