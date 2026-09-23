"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/shell/ErrorScreen";

/** A page inside the shell failing: the sidebar and nav stay where they are. */
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
      <ErrorScreen retry={retry} />
    </div>
  );
}
