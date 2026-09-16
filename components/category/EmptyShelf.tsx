import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { categoryHref, type CategoryParams } from "@/lib/items";
import { STATUS_STYLE, statusLabels, type CategoryKind, type ItemStatus } from "@/lib/status";
import { ShelfIllustration } from "./ShelfIllustration";

export type EmptyReason =
  | { type: "empty" }
  | { type: "status"; status: ItemStatus }
  | { type: "favourites" }
  | { type: "filter"; query: string };

type EmptyShelfProps = {
  kind: CategoryKind;
  slug: string;
  params: CategoryParams;
  reason: EmptyReason;
  onAdd: () => void;
  onClearFilter: () => void;
};

/** One serif line, one muted sentence, one action. */
export function EmptyShelf({ kind, slug, params, reason, onAdd, onClearFilter }: EmptyShelfProps) {
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
    title = <>Nothing called <em className={accent}>that.</em></>;
    body = `No titles here match “${reason.query.trim()}”.`;
    action = <Button variant="secondary" onClick={onClearFilter}>Clear filter</Button>;
  } else if (reason.type === "favourites") {
    title = <>No favourites <em className={accent}>here.</em></>;
    body = "Star a title and it shows up in this view.";
    action = link({ fav: false }, "Show everything");
  } else if (reason.type === "empty") {
    title = <>This shelf is <em className={accent}>empty.</em></>;
    body = "Add the first title. The rest tends to follow.";
    action = add("Add a title");
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
