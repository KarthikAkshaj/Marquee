"use client";

import { useEffect, useState } from "react";
import { checkUsername, type UsernameCheck } from "@/lib/actions/profile";
import { USERNAME_PATTERN } from "@/lib/profile";

export type UsernameState = UsernameCheck | { status: "unchanged" } | { status: "checking" };

export const USERNAME_RULES = "3–20 characters: lowercase letters, numbers and _.";

/**
 * Live availability (SPEC §8.10), debounced so typing doesn't fire a check per
 * key. Stale answers for an earlier spelling are ignored.
 */
export function useUsernameCheck(value: string, current: string, delay = 400): UsernameState {
  const [answer, setAnswer] = useState<{ value: string; check: UsernameCheck } | null>(null);
  const checkable = value !== current && USERNAME_PATTERN.test(value);

  useEffect(() => {
    if (!checkable) return;
    let live = true;
    const timer = setTimeout(async () => {
      const check = await checkUsername(value);
      if (live) setAnswer({ value, check });
    }, delay);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [checkable, value, delay]);

  if (value === current) return { status: "unchanged" };
  if (!USERNAME_PATTERN.test(value)) return { status: "invalid", message: USERNAME_RULES };
  if (answer?.value !== value) return { status: "checking" };
  return answer.check;
}
