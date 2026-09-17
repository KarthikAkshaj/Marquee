import { SOURCE_NAMES, TMDB_NOTICE } from "@/lib/add";
import type { SearchSource } from "@/lib/search/types";

const KEYS = [
  ["↑↓", "move"],
  ["←→", "status"],
  ["Enter", "add to list"],
  ["Alt + Enter", "add and open"],
] as const;

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="rounded-[4px] border border-white/8 bg-elevated px-1.5 py-0.5 font-mono text-[10.5px] text-text [font-variant-ligatures:none]">
      {children}
    </kbd>
  );
}

/** Keyboard hints (handoff §04) and the data credit the provider's terms ask for. */
export function AddPanelFooter({ source }: { source: SearchSource }) {
  return (
    <div className="border-t border-white/7 bg-bg/40">
      <div className="hidden flex-wrap items-center gap-x-4.5 gap-y-2 px-5 py-2.75 md:flex">
        {KEYS.map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <Keycap>{key}</Keycap>
            <span className="text-[11.5px] text-text-muted">{label}</span>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1.5">
          <Keycap>Esc</Keycap>
          <span className="text-[11.5px] text-text-muted">back to the couch</span>
        </span>
      </div>
      <p className="border-white/5 px-5 py-2 font-mono text-[9.5px] leading-[1.45] text-text-faint md:border-t">
        {source === "tmdb" ? TMDB_NOTICE : `Data from ${SOURCE_NAMES[source]}.`}
      </p>
    </div>
  );
}
