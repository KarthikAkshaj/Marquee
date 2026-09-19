import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SOURCE_FOR_KIND, SOURCE_NAMES, searchKindOf } from "@/lib/add";
import { categoryHref, type CategoryParams } from "@/lib/items";
import { STATUS_STYLE, statusLabels, type CategoryKind, type ItemStatus } from "@/lib/status";
import { ShelfIllustration } from "./ShelfIllustration";

export type EmptyReason =
  | { type: "empty" }
  | { type: "status"; status: ItemStatus }
  | { type: "favourites" }
  | { type: "filter"; query: string };

/** Why nothing is showing, or null when something is. */
export function emptyReason(shown: number, query: string, total: number, params: CategoryParams): EmptyReason | null {
  if (shown > 0) return null;
  if (query.trim()) return { type: "filter", query };
  if (total === 0) return { type: "empty" };
  if (params.fav) return { type: "favourites" };
  if (params.status !== "all") return { type: "status", status: params.status };
  return { type: "empty" };
}

type EmptyShelfProps = {
  kind: CategoryKind;
  slug: string;
  params: CategoryParams;
  reason: EmptyReason;
  onAdd: () => void;
  /** Look the filter text up to add it; only shelves with a provider. */
  onSearch?: (query: string) => void;
  onClearFilter: () => void;
};

/** One serif line, one muted sentence, one action. */
export function EmptyShelf({ kind, slug, params, reason, onAdd, onSearch, onClearFilter }: EmptyShelfProps) {
  const labels = statusLabels(kind);
  const link = (patch: Partial<CategoryParams>, text: string) => (
    <Button asChild variant="secondary">
      <Link href={categoryHref(slug, params, patch)} scroll={false}>
        {text}
      </Link>
    </Button>
  );
  const add = (text: string) => (
    <Button variant="secondary" onClick={onAdd}>
      {text}
    </Button>
  );

  let illustration: "queue" | "dropped" | "posters" = "posters";
  let accent = "text-accent";
  let title: ReactNode;
  let body: string;
  let action: ReactNode;

  if (reason.type === "filter") {
    const typed = reason.query.trim();
    const source = searchKindOf(kind);
    title = <>Nothing called <em className={accent}>that.</em></>;
    if (onSearch && source) {
      // Not on the shelf yet: offer to go and find it, text already typed.
      body = `No titles here match “${typed}”. Want to add it?`;
      action = (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Button variant="secondary" onClick={() => onSearch(typed)}>
            Search {SOURCE_NAMES[SOURCE_FOR_KIND[source]]} for “{typed}”
          </Button>
          <button type="button" onClick={onClearFilter} className="min-h-11 text-13 text-text-muted transition-colors hover:text-text">
            Clear filter
          </button>
        </div>
      );
    } else {
      body = `No titles here match “${typed}”.`;
      action = <Button variant="secondary" onClick={onClearFilter}>Clear filter</Button>;
    }
  } else if (reason.type === "favourites") {
    title = <>No favourites <em className={accent}>here.</em></>;
    body = "Star a title and it shows up in this view.";
    action = link({ fav: false }, "Show everything");
  } else if (reason.type === "empty") {
    title = <>This shelf is <em className={accent}>empty.</em></>;
    body = "Add the first title, or paste in the whole list you've been keeping somewhere.";
    action = (
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {add("Add a title")}
        <Link href={`/import?category=${encodeURIComponent(slug)}`} className="flex min-h-11 items-center text-13 text-text-muted transition-colors hover:text-text">
          Import a list
        </Link>
      </div>
    );
  } else {
    accent = STATUS_STYLE[reason.status].text;
    switch (reason.status) {
      case "planned":
        illustration = "queue";
        title = <>Nothing queued. <em className={accent}>Suspiciously productive.</em></>;
        body = "Anything you add but haven't started waits here until the couch calls.";
        action = add("Queue something up");
        break;
      case "in_progress":
        title = <>Nothing <em className={accent}>mid-flight.</em></>;
        body = "Start something and it'll keep your place here.";
        action = link({ status: "planned" }, `See ${labels.planned}`);
        break;
      case "completed":
        title = <>Nothing finished. <em className={accent}>Yet.</em></>;
        body = "Wrap one up and it lands here with the date on it.";
        action = link({ status: "in_progress" }, `See ${labels.in_progress}`);
        break;
      case "dropped":
        illustration = "dropped";
        title = <>No regrets. <em className={accent}>Yet.</em></>;
        body = "Whatever you give up on lands here — quietly, and without a word from us.";
        action = link({ status: "in_progress" }, `Back to ${labels.in_progress}`);
        break;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6.5 px-2 py-16 text-center">
      <ShelfIllustration variant={illustration} />
      <div className="flex max-w-110 flex-col items-center gap-3">
        <h2 className="font-display text-[30px] leading-[1.1] text-balance md:text-[36px]">{title}</h2>
        <p className="text-14 leading-[1.6] text-pretty text-text-muted">{body}</p>
        <div className="mt-1.5">{action}</div>
      </div>
    </div>
  );
}
