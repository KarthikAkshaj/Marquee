"use client";

import { Command } from "cmdk";
import { Loader2, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode, Ref } from "react";
import type { CategoryKind, ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { StatusStepper } from "./StatusStepper";

type AddSearchHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  label?: string;
  loading: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** Which shelf adds land on: a fixed chip, or the palette's shelf menu. */
  target: ReactNode;
  /** The status stepper, when there's somewhere to add to. */
  status: { kind: CategoryKind; value: ItemStatus; onStep: (direction: 1 | -1) => void } | null;
};

/** The query, which shelf it lands on, and the status it goes in as. */
export function AddSearchHeader({ query, onQueryChange, placeholder, label, loading, inputRef, target, status }: AddSearchHeaderProps) {
  const Icon = loading ? Loader2 : Search;
  return (
    <div className="border-b border-white/7 px-4 pt-2 pb-3 md:flex md:items-center md:gap-3 md:px-5 md:py-4.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Icon
          aria-hidden
          className={cn("size-3.75 shrink-0 text-accent", loading && "animate-spin motion-reduce:animate-none")}
          strokeWidth={2.2}
        />
        <Command.Input
          ref={inputRef}
          value={query}
          onValueChange={onQueryChange}
          placeholder={placeholder}
          aria-label={label}
          maxLength={100}
          className="h-11 min-w-0 flex-1 bg-transparent text-[16.5px] text-text caret-accent outline-none placeholder:text-text-muted md:h-auto"
        />
        <Dialog.Close
          aria-label="Close"
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-text-muted hover:text-text md:hidden"
        >
          <X aria-hidden className="size-4.5" strokeWidth={1.8} />
        </Dialog.Close>
      </div>

      {(target || status) && (
        <div className="mt-1 flex items-center gap-2 md:mt-0">
          {target}
          {status && <StatusStepper kind={status.kind} value={status.value} onStep={status.onStep} />}
        </div>
      )}
    </div>
  );
}
