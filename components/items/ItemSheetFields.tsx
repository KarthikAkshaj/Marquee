"use client";

import { useId } from "react";
import { SOURCE_NAMES } from "@/lib/add";
import { progressUnit, type Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";
import { ItemDates } from "./ItemDates";
import { NotesField } from "./NotesField";
import { ProgressStepper } from "./ProgressStepper";
import { RatingBar } from "./RatingBar";
import { StatusSegmented } from "./StatusSegmented";
import type { ItemActions } from "./useItemActions";

type ItemSheetFieldsProps = {
  item: Item;
  kind: CategoryKind;
  actions: ItemActions;
};

/** Status, progress, rating, dates and notes (SPEC §8.6). Everything saves as it changes. */
export function ItemSheetFields({ item, kind, actions }: ItemSheetFieldsProps) {
  const statusLabel = useId();
  const unit = progressUnit(kind);
  const community =
    item.community_score !== null && item.source !== "manual"
      ? { source: SOURCE_NAMES[item.source], score: item.community_score }
      : null;

  return (
    // relative: the header's backdrop runs taller than the header on phones and would paint over these.
    <div className="relative flex flex-col gap-4.5 px-5 pt-5.5 pb-6 md:gap-5 md:px-7 md:pb-5">
      <div>
        <p id={statusLabel} className="label-mono mb-2 tracking-[.12em] text-text-muted">
          Status
        </p>
        <StatusSegmented
          kind={kind}
          value={item.status}
          labelledBy={statusLabel}
          onChange={(status) => actions.setStatus(item, status)}
        />
      </div>

      <div className="flex flex-col gap-4.5 md:flex-row md:gap-4">
        {unit && (
          <ProgressStepper
            item={item}
            unit={unit}
            onIncrement={() => actions.increment(item)}
            onChange={(current, total) => actions.setProgress(item, current, total)}
          />
        )}
        <RatingBar
          value={item.rating}
          community={community}
          onChange={(rating) => actions.updateDetails(item, { rating })}
        />
      </div>

      <ItemDates item={item} onChange={(dates) => actions.updateDetails(item, dates)} />

      <NotesField key={item.id} value={item.notes} onSave={(notes) => actions.updateDetails(item, { notes })} />
    </div>
  );
}
