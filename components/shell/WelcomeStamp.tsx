"use client";

import { useEffect, useState } from "react";
import { TicketStamp } from "@/components/fun/TicketStamp";
import { WELCOME_COOKIE, hasWelcome } from "@/lib/auth/welcome";

/**
 * ADMIT ONE · ENJOY THE SHOW, stamped over the page once when a Google or
 * magic-link sign-in arrives (U25), the way a typed code is stamped on the
 * sign-in page. The cookie is cleared as the stamp comes down, so a reload
 * doesn't greet you twice.
 */
export function WelcomeStamp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasWelcome(document.cookie)) return;
    const frame = requestAnimationFrame(() => {
      document.cookie = `${WELCOME_COOKIE}=; Max-Age=0; Path=/`;
      setShow(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-60">
      <TicketStamp size="lg" caption="ENJOY THE SHOW" onDone={() => setShow(false)} />
      <p role="status" className="sr-only">
        You&apos;re in.
      </p>
    </div>
  );
}
