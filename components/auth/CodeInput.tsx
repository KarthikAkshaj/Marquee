"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { OTP_LENGTH } from "@/lib/auth/otp";
import { cn } from "@/lib/utils";

type CodeInputProps = {
  invalid?: boolean;
  readOnly?: boolean;
  describedBy?: string;
  /** Every change, with the digits entered so far. */
  onChange?: (code: string) => void;
  /** Once all six boxes are filled. */
  onComplete: (code: string) => void;
};

const EMPTY: readonly string[] = Array.from({ length: OTP_LENGTH }, () => "");

/**
 * Six single-digit boxes (SPEC §8.2): auto-advance, paste a whole code into any
 * box, backspace walks back, and phones can autofill via `one-time-code`.
 * Remount it (change its `key`) to clear it after a failed attempt.
 */
export function CodeInput({ invalid, readOnly, describedBy, onChange, onComplete }: CodeInputProps) {
  const [digits, setDigits] = useState<readonly string[]>(EMPTY);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join("");

  const report = useEffectEvent((value: string) => {
    onChange?.(value);
    if (value.length === OTP_LENGTH) onComplete(value);
  });

  useEffect(() => {
    report(code);
  }, [code]);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  function focusBox(index: number) {
    boxes.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
  }

  /** Writes digits starting at `from`; a full code always starts at the first box. */
  function fill(from: number, text: string) {
    const incoming = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!incoming) return;

    const start = incoming.length === OTP_LENGTH ? 0 : from;
    setDigits((previous) => {
      const next = [...previous];
      for (let offset = 0; offset < incoming.length && start + offset < OTP_LENGTH; offset++) {
        next[start + offset] = incoming[offset];
      }
      return next;
    });
    focusBox(start + incoming.length);
  }

  function clear(index: number) {
    setDigits((previous) => previous.map((digit, i) => (i === index ? "" : digit)));
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      clear(index - 1);
      focusBox(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fill(index, event.clipboardData.getData("text"));
  }

  return (
    <div
      role="group"
      aria-label={`${OTP_LENGTH}-digit code`}
      // 4px gaps on narrow phones keep each box at least 44px wide (SPEC §8.3).
      className={cn("flex gap-1 sm:gap-2", invalid && "animate-shake")}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element;
          }}
          name="code"
          value={digit}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          readOnly={readOnly}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onFocus={(event) => event.target.select()}
          onChange={(event) =>
            event.target.value === "" ? clear(index) : fill(index, event.target.value)
          }
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          className={cn(
            "h-12 w-full min-w-0 flex-1 rounded-card border bg-surface text-center font-mono text-[22px] text-text caret-accent md:h-14 md:text-[24px]",
            "transition-[border-color,box-shadow] duration-150 ease-cinematic",
            "focus-visible:border-accent/40 focus-visible:shadow-input-focus focus-visible:outline-none",
            invalid ? "border-dropped/60 text-dropped" : digit ? "border-white/14" : "border-white/10",
          )}
        />
      ))}
    </div>
  );
}
