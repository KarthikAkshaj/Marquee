"use client";

import { Command } from "cmdk";
import { Loader2, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { categoryStyle } from "@/lib/categories";
import type { CategoryKind, ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { StatusStepper } from "./StatusStepper";

type AddSearchHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  loading: boolean;
  category: { name: string; color: string; kind: CategoryKind };
  status: ItemStatus;
  onStepStatus: (direction: 1 | -1) => void;
};

/** The query, which shelf it lands on, and the status it goes in as. */
export function AddSearchHeader({ query, onQueryChange, placeholder, loading, category, status, onStepStatus }: AddSearchHeaderProps) {
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
          value={query}
          onValueChange={onQueryChange}
          placeholder={placeholder}
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

      <div className="mt-1 flex items-center gap-2 md:mt-0">
        <span className="flex h-7.5 items-center gap-1.75 rounded-full border border-white/8 bg-elevated px-2.75 whitespace-nowrap">
          <span aria-hidden className={cn("size-1.25 rounded-full", categoryStyle(category.color).dot)} />
          <span className="text-[11.5px] text-text">Add to {category.name}</span>
        </span>
        <StatusStepper kind={category.kind} value={status} onStep={onStepStatus} />
      </div>
    </div>
  );
}
