"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTCHA_SITE_KEY, captchaEnabled } from "@/lib/captcha";

type Widget = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (id: string, options: { async: true }) => Promise<{ response: string }>;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    hcaptcha?: Widget;
    onHcaptchaReady?: () => void;
  }
}

// hCaptcha calls `onload` itself once its API can take a render(). The script
// tag's own load event fires before that, and rendering there earns a warning.
const SCRIPT = "https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHcaptchaReady";
// A script that loads but never calls back would otherwise hang the submit.
const GIVE_UP_AFTER = 10_000;
let loading: Promise<Widget> | null = null;

/** One script for the page, however many forms ask for it. */
function loadHcaptcha(): Promise<Widget> {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  loading ??= new Promise<Widget>((resolve, reject) => {
    const fail = (message: string) => {
      clearTimeout(timer);
      loading = null;
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail("hcaptcha did not start"), GIVE_UP_AFTER);

    window.onHcaptchaReady = () => {
      clearTimeout(timer);
      if (window.hcaptcha) resolve(window.hcaptcha);
      else fail("hcaptcha did not start");
    };

    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.defer = true;
    script.onerror = () => fail("hcaptcha could not be reached");
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
  const [ready, setReady] = useState(!captchaEnabled());

  /** The one widget, put up on first need and kept for the rest of the visit. */
  const place = useCallback((hcaptcha: Widget) => {
    if (widget.current !== null) return widget.current;
    if (!mount.current) throw new Error("captcha has nowhere to go");
    widget.current = hcaptcha.render(mount.current, { sitekey: CAPTCHA_SITE_KEY, size: "invisible", theme: "dark" });
    return widget.current;
  }, []);

  useEffect(() => {
    if (!captchaEnabled()) return;
    let cancelled = false;
    void loadHcaptcha()
      .then((hcaptcha) => {
        if (cancelled) return;
        place(hcaptcha);
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
    const hcaptcha = await loadHcaptcha();
    const id = place(hcaptcha);
    try {
      return (await hcaptcha.execute(id, { async: true })).response;
    } finally {
      // Clearing the used token happens after, never before: a widget reset on
      // its way into execute() has nothing left to answer the challenge with.
      hcaptcha.reset(id);
    }
  }, [place]);

  return { mount, getToken, ready };
}
