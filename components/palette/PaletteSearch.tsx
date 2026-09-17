"use client";

import { Command } from "cmdk";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { AddPanelFooter } from "@/components/add/AddPanelFooter";
import { AddSearchHeader } from "@/components/add/AddSearchHeader";
import { GroupHeading } from "@/components/add/GroupHeading";
import { ManualAddRow } from "@/components/add/ManualAddRow";
import { useAddTitle } from "@/components/add/useAddTitle";
import { defaultAddTarget, titleHref, type PaletteCategory, type PaletteTitle } from "@/lib/palette";
import { ITEM_STATUSES, type ItemStatus } from "@/lib/status";
import { AddResultsGroup } from "./AddResultsGroup";
import { GoToGroup } from "./GoToGroup";
import { LinkRow } from "./LinkRow";
import { TargetMenu } from "./TargetMenu";
import { TitleRow } from "./TitleRow";
import { usePaletteActions } from "./usePaletteActions";
import { MANUAL, usePaletteRows } from "./usePaletteRows";

type PaletteSearchProps = {
  categories: PaletteCategory[];
  /** Null until the first load finishes. */
  titles: PaletteTitle[] | null;
  onClose: () => void;
  onManual: (category: PaletteCategory, title: string, status: ItemStatus) => void;
};

/**
 * The ⌘K palette (SPEC §8.8): your titles, places to go, actions, and search
 * results to add to the chosen shelf, all from one box. Same keys as the add
 * panel: ←→ step the status once you're moving through rows, Alt+Enter adds
 * and opens.
 */
export function PaletteSearch({ categories, titles, onClose, onManual }: PaletteSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const addTitle = useAddTitle();
  const actions = usePaletteActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState(() => defaultAddTarget(categories, pathname));
  const [status, setStatus] = useState<ItemStatus>("planned");
  const [navigating, setNavigating] = useState(false);
  const [selected, setSelected] = useState("");
  const rows = usePaletteRows({ query, categories, titles, actions, target });
  const active = rows.values.includes(selected) ? selected : (rows.values[0] ?? "");

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function choose(value: string, openAfter = false) {
    const title = rows.titleRows.find((row) => row.value === value);
    const link = rows.linkRows.find((row) => row.value === value);
    const action = rows.actionRows.find((row) => row.value === value);
    const add = rows.addRows.find((row) => row.value === value);
    if (title) return go(titleHref(title.shelf, title.title.id));
    if (link) return go(link.href);
    if (action) {
      onClose();
      return action.run();
    }
    if (!target) return;
    if (add?.duplicate) return go(titleHref(target, add.duplicate.id));
    onClose();
    if (add) void addTitle(target, add.result, status, openAfter);
    else if (value === MANUAL) onManual(target, rows.typed, status);
  }

  function stepStatus(direction: 1 | -1) {
    setStatus((current) => ITEM_STATUSES[(ITEM_STATUSES.indexOf(current) + direction + ITEM_STATUSES.length) % ITEM_STATUSES.length]);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      setNavigating(true);
    } else if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && navigating && target) {
      event.preventDefault();
      stepStatus(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      if (active) choose(active, true);
    }
  }

  return (
    <Command
      label="Search Marquee"
      shouldFilter={false}
      loop
      vimBindings={false}
      value={active}
      onValueChange={setSelected}
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col"
    >
      <AddSearchHeader
        query={query}
        onQueryChange={(next) => {
          setQuery(next);
          setNavigating(false);
        }}
        placeholder="Find a title, add one, or jump anywhere…"
        label="Search your titles, add something new, or go somewhere"
        loading={rows.search.loading}
        inputRef={inputRef}
        target={target && <TargetMenu categories={categories} target={target} onChange={setTarget} onDone={() => inputRef.current?.focus()} />}
        status={target && { kind: target.kind, value: status, onStep: stepStatus }}
      />

      <Command.List aria-busy={rows.search.loading} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {rows.titleRows.length > 0 && (
          <Command.Group heading={<GroupHeading>{rows.typed ? "Your titles" : "Recently updated"}</GroupHeading>}>
            {rows.titleRows.map((row) => (
              <TitleRow key={row.value} value={row.value} title={row.title} category={row.shelf} selected={row.value === active} onSelect={() => choose(row.value)} />
            ))}
          </Command.Group>
        )}

        <GoToGroup links={rows.linkRows} counts={rows.counts} active={active} onChoose={choose} />

        {rows.actionRows.length > 0 && (
          <Command.Group heading={<GroupHeading>Actions</GroupHeading>}>
            {rows.actionRows.map((action) => (
              <LinkRow key={action.value} value={action.value} label={action.label} icon={action.icon} hint="do it" selected={action.value === active} onSelect={() => choose(action.value)} />
            ))}
          </Command.Group>
        )}

        {target && rows.source && rows.typed.length >= 2 && (
          <AddResultsGroup target={target} rows={rows.addRows} notice={rows.notice} loading={rows.search.loading} active={active} onChoose={choose} />
        )}

        {rows.typed && target && (
          <ManualAddRow value={MANUAL} title={rows.typed} shelfName={target.name} divided={rows.values.length > 1} onSelect={() => choose(MANUAL)} />
        )}
      </Command.List>

      <AddPanelFooter source={rows.source} enterLabel="choose" />
    </Command>
  );
}
