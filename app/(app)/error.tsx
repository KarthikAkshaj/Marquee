"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <h1 className="font-display text-[40px] leading-[1.05] md:text-[50px]">
        The projector <em className="text-accent">jammed.</em>
      </h1>
      <p className="mt-3.5 max-w-110 text-[15px] leading-[1.6] text-text-muted">
        We couldn&apos;t load this page. Give it another go.
      </p>
      <Button className="mt-6" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
