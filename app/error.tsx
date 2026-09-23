"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/shell/ErrorScreen";

/**
 * The boundary above the app shell, and the only one that catches the shell
 * failing: an error.tsx never sees a throw from the layout it sits inside, so
 * (app)/error.tsx misses the viewer and category reads in (app)/layout.tsx.
 * Without this they land on Next's own page, which carries a digest number and
 * no way back.
 */
export default function RootError({
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      <ErrorScreen retry={retry} />
    </div>
  );
}
