"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { USERNAME_RULES, type UsernameState } from "./useUsernameCheck";

type UsernameFieldProps = {
  value: string;
  state: UsernameState;
  onChange: (value: string) => void;
};

/** `@` + name with a live ✓ available / ✕ taken pill (SPEC §8.10, handoff §07). */
export function UsernameField({ value, state, onChange }: UsernameFieldProps) {
  const bad = state.status === "taken" || (state.status === "invalid" && value.length > 0);

  return (
    <div>
      <label htmlFor="profile-username" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
        Username
      </label>
      <div
        className={cn(
          "flex h-11.5 items-center overflow-hidden rounded-card border bg-surface pr-2.25 transition-[border-color,box-shadow] md:h-11 md:pr-3",
          "focus-within:shadow-input-focus",
          bad ? "border-dropped-muted/50" : state.status === "available" ? "border-completed/40" : "border-white/9 focus-within:border-accent/40",
        )}
      >
        <span aria-hidden className="flex w-9 self-stretch items-center justify-center border-r border-border font-mono text-14 text-text-faint md:w-9.5">
          @
        </span>
        <input
          id="profile-username"
          value={value}
          // Lowercase as you type; spaces become underscores.
          onChange={(event) => onChange(event.target.value.toLowerCase().replace(/\s/g, "_"))}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={bad || undefined}
          aria-describedby="profile-username-hint"
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-mono text-14 text-text outline-none focus-visible:outline-none md:px-3"
        />
        <Pill state={state} />
      </div>
      <p
        id="profile-username-hint"
        aria-live="polite"
        className={cn("mt-1.75 text-[11.5px]", bad ? "text-dropped-muted" : "text-text-muted")}
      >
        <Hint state={state} onUse={onChange} />
      </p>
    </div>
  );
}

function Pill({ state }: { state: UsernameState }) {
  if (state.status === "available") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-completed/14 px-2.5 py-1 text-[11.5px] font-medium text-completed">
        <Check aria-hidden className="size-3" strokeWidth={2.4} /> available
      </span>
    );
  }
  if (state.status === "taken") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-dropped-muted/16 px-2.5 py-1 text-[11.5px] font-medium text-dropped">
        <X aria-hidden className="size-3" strokeWidth={2.4} /> taken
      </span>
    );
  }
  if (state.status === "checking") {
    return <span className="shrink-0 px-1 text-[11.5px] text-text-muted">checking…</span>;
  }
  return null;
}

function Hint({ state, onUse }: { state: UsernameState; onUse: (value: string) => void }) {
  if (state.status === "taken") {
    return state.suggestion ? (
      <>
        Someone got there first. Try{" "}
        <button type="button" onClick={() => onUse(state.suggestion!)} className="font-mono text-accent underline-offset-2 hover:underline">
          {state.suggestion}
        </button>
        .
      </>
    ) : (
      "Someone got there first. Try another."
    );
  }
  if (state.status === "invalid") return state.message || USERNAME_RULES;
  if (state.status === "unknown") return "Couldn't check that just now. It's checked again when you save.";
  return USERNAME_RULES;
}
