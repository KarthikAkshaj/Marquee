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
  }
}

const SCRIPT = "https://js.hcaptcha.com/1/api.js?render=explicit";
let loading: Promise<Widget> | null = null;

/** One script for the page, however many forms ask for it. */
function loadHcaptcha(): Promise<Widget> {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  loading ??= new Promise<Widget>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.hcaptcha ? resolve(window.hcaptcha) : reject(new Error("hcaptcha did not start")));
    script.onerror = () => {
      loading = null;
      reject(new Error("hcaptcha could not be reached"));
    };
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

  useEffect(() => {
    if (!captchaEnabled()) return;
    let cancelled = false;
    void loadHcaptcha()
      .then((hcaptcha) => {
        if (cancelled || !mount.current || widget.current !== null) return;
        widget.current = hcaptcha.render(mount.current, { sitekey: CAPTCHA_SITE_KEY, size: "invisible", theme: "dark" });
        setReady(true);
      })
      // A blocked script shouldn't disable the button: the submit says what went wrong.
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const getToken = useCallback(async () => {
    if (!captchaEnabled()) return null;
    const hcaptcha = await loadHcaptcha();
    const id = widget.current;
    if (id === null) throw new Error("captcha not ready");
    hcaptcha.reset(id);
    const { response } = await hcaptcha.execute(id, { async: true });
    return response;
  }, []);

  return { mount, getToken, ready };
}
