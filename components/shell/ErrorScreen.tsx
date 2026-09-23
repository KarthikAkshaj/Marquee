"use client";

import { Button } from "@/components/ui/Button";

/** One wording for a page that didn't load, shared by the error boundaries. */
export function ErrorScreen({ retry }: { retry: () => void }) {
  return (
    <>
      <h1 className="font-display text-[40px] leading-[1.05] md:text-[50px]">
        The projector <em className="text-accent">jammed.</em>
      </h1>
      <p className="mt-3.5 max-w-110 text-[15px] leading-[1.6] text-text-muted">
        We couldn&apos;t load this page. Give it another go.
      </p>
      <Button className="mt-6" onClick={() => retry()}>
        Try again
      </Button>
    </>
  );
}
