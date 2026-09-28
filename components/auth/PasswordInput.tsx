"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/** A password field with a show/hide toggle at its right edge. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        type={shown ? "text" : "password"}
        // Managers and phones offer a saved one; nobody wants it autocorrected.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        aria-label="Show password"
        aria-pressed={shown}
        onClick={() => setShown((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-11.5 items-center justify-center rounded-r-card text-text-muted transition-colors hover:text-text"
      >
        <Icon aria-hidden className="size-4.25" strokeWidth={1.5} />
      </button>
    </div>
  );
}
