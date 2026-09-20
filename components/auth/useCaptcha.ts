"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTCHA_SITE_KEY, captchaEnabled } from "@/lib/captcha";

type Options = Record<string, unknown>;
type Turnstile = {
  render: (container: HTMLElement, options: Options) => string;
  execute: (container: HTMLElement, options?: Options) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
    onTurnstileReady?: () => void;
  }
}

// Turnstile calls `onload` itself once its API can take a render(). The script
// tag's own load event fires before that.
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady";
// A script that loads but never calls back would otherwise hang the submit.
const GIVE_UP_AFTER = 10_000;
let loading: Promise<Turnstile> | null = null;

/** One script for the page, however many forms ask for it. */
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const fail = (message: string) => {
      clearTimeout(timer);
      loading = null;
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail("turnstile did not start"), GIVE_UP_AFTER);

    window.onTurnstileReady = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else fail("turnstile did not start");
    };

    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.defer = true;
    script.onerror = () => fail("turnstile could not be reached");
    document.head.append(script);
  });
  return loading;
}

/**
 * A token for one submission. `mount` goes on an empty div; `getToken()`
 * resolves to the token, or to null when there's no site key to use.
 */
export function useCaptcha() {
  const mount = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  // Turnstile hands its answer to a callback rather than returning a promise,
  // so a submit in flight parks its resolve here and waits.
  const waiting = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void } | null>(null);
  const [ready, setReady] = useState(!captchaEnabled());

  const settle = useCallback((outcome: string | Error) => {
    const submission = waiting.current;
    waiting.current = null;
    if (!submission) return;
    if (outcome instanceof Error) submission.reject(outcome);
    else submission.resolve(outcome);
  }, []);

  /** The one widget, put up on first need and kept for the rest of the visit. */
  const place = useCallback(
    (turnstile: Turnstile) => {
      const container = mount.current;
      if (!container) throw new Error("captcha has nowhere to go");
      widget.current ??= turnstile.render(container, {
        sitekey: CAPTCHA_SITE_KEY,
        // Nothing appears until a submit asks for a token, and then only if
        // Cloudflare wants this particular visitor to prove something.
        execution: "execute",
        appearance: "interaction-only",
        theme: "dark",
        callback: (token: string) => settle(token),
        "error-callback": () => settle(new Error("the robot check failed")),
        "expired-callback": () => settle(new Error("the robot check expired")),
        "timeout-callback": () => settle(new Error("the robot check timed out")),
      });
      return { id: widget.current, container };
    },
    [settle],
  );

  useEffect(() => {
    if (!captchaEnabled()) return;
    let cancelled = false;
    void loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        place(turnstile);
        setReady(true);
      })
      // A blocked script shouldn't disable the button: the submit says what went wrong.
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [place]);

  const getToken = useCallback(async () => {
    if (!captchaEnabled()) return null;
    const turnstile = await loadTurnstile();
    const { id, container } = place(turnstile);
    // Registered before the challenge runs: an instant answer still lands here.
    const token = new Promise<string>((resolve, reject) => {
      waiting.current = { resolve, reject };
    });
    turnstile.execute(container);
    try {
      return await token;
    } finally {
      // Clearing the used token happens after, never before: a widget reset on
      // its way into execute() has nothing left to answer the challenge with.
      turnstile.reset(id);
    }
  }, [place]);

  return { mount, getToken, ready };
}
