"use client";

import { SOURCE_NAMES, TMDB_NOTICE } from "@/lib/add";
import type { SearchSource } from "@/lib/search/types";
import { shortcutKeys, useIsMac } from "@/lib/use-platform";

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="rounded-[4px] border border-white/8 bg-elevated px-1.5 py-0.5 font-mono text-[10.5px] text-text [font-variant-ligatures:none]">
      {children}
    </kbd>
  );
}

type AddPanelFooterProps = {
  /** Whose data is on screen, for the credit line. None when nothing's being searched. */
  source: SearchSource | null;
  enterLabel?: string;
};

/** Keyboard hints (handoff §04) and the data credit the provider's terms ask for. */
export function AddPanelFooter({ source, enterLabel = "add to list" }: AddPanelFooterProps) {
  const { alt } = shortcutKeys(useIsMac());
  const keys = [
    ["↑↓", "move"],
    ["←→", "status"],
    ["Enter", enterLabel],
    [`${alt} + Enter`, "add and open"],
  ];

  return (
    <div className="border-t border-white/7 bg-bg/40">
      <div className="hidden flex-wrap items-center gap-x-4.5 gap-y-2 px-5 py-2.75 md:flex">
        {keys.map(([key, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <Keycap>{key}</Keycap>
            <span className="text-[11.5px] text-text-muted">{label}</span>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1.5">
          <Keycap>Esc</Keycap>
          <span className="text-[11.5px] text-text-muted">back to the couch</span>
        </span>
      </div>
      {source && (
        <p className="border-white/5 px-5 py-2 font-mono text-[9.5px] leading-[1.45] text-text-faint md:border-t">
          {source === "tmdb" ? TMDB_NOTICE : `Data from ${SOURCE_NAMES[source]}.`}
        </p>
      )}
    </div>
  );
}
