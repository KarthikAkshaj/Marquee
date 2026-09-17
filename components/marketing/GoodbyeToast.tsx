"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/** After deleting an account the user lands on `/?goodbye=1` (SPEC §8.10). Says so once, then tidies the URL. */
export function GoodbyeToast() {
  const goodbye = useSearchParams().get("goodbye") === "1";

  useEffect(() => {
    if (!goodbye) return;
    toast("The marquee's dark. Account deleted.", { id: "goodbye" });
    window.history.replaceState(null, "", "/");
  }, [goodbye]);

  return null;
}
