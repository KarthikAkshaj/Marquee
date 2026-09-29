"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { StatusStepper } from "@/components/add/StatusStepper";
import { Button } from "@/components/ui/Button";
import { copySharedTitles } from "@/lib/actions/shared";
import { KIND_NAMES } from "@/lib/categories";
import type { PublicTitle, ShelfAccess, ViewerCopy, ViewerShelf } from "@/lib/public-profile";
import { labelKind, stepStatus, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ShelfChoice } from "./ShelfChoice";

type AddToMyShelfProps = {
  title: PublicTitle;
  /** How the visitor reached the shelf it's on. */
  access: ShelfAccess;
  /** The kind of shelf it's on: it can only go on one of yours of the same kind. */
  kind: CategoryKind;
  /** Signed out: where signing in starts, coming back to this card. */
  signInHref: string | null;
  /** Your shelves of that kind. */
  shelves: ViewerShelf[];
  /** Your copy, if you have it already. */
  copy: ViewerCopy | null;
  onAdded: (copy: ViewerCopy) => void;
};

export const copyHref = (shelf: Pick<ViewerShelf, "slug">, item: string) => `/c/${encodeURIComponent(shelf.slug)}?item=${item}`;

/**
 * The foot of a shared title's card (SPEC §19): put it on your own shelf in a
 * status you pick, or see that it's there already. Signed out, it's the way in.
 */
export function AddToMyShelf({ title, access, kind, signInHref, shelves, copy, onAdded }: AddToMyShelfProps) {
  const router = useRouter();
  const [shelfId, setShelfId] = useState(shelves[0]?.id ?? null);
  const [status, setStatus] = useState<ItemStatus>("planned");
  const [pending, startTransition] = useTransition();
  const shelf = shelves.find((candidate) => candidate.id === shelfId) ?? shelves[0];

  if (signInHref) {
    return (
      <Box>
        <p className="text-13 text-text-muted">Want it on your own shelves?</p>
        <Button asChild variant="secondary" size="sm" className="h-11 md:h-8">
          <Link href={signInHref}>Sign in to add it</Link>
        </Button>
      </Box>
    );
  }

  if (copy) {
    const home = shelves.find((candidate) => candidate.id === copy.shelf);
    return (
      <Box>
        <p className="flex items-center gap-2 text-13">
          <Check aria-hidden className="size-4 text-completed" strokeWidth={2.2} />
          {home ? `On your ${home.name} shelf` : "On your shelves"}
        </p>
        {home && (
          <Link href={copyHref(home, copy.item)} className="flex min-h-11 items-center text-13 text-accent underline-offset-3 hover:underline md:min-h-0">
            Open <span className="sr-only">{title.title} on your shelf</span>
          </Link>
        )}
      </Box>
    );
  }

  if (!shelf) {
    return (
      <Box>
        <p className="text-13 text-text-muted">No shelf of yours takes {KIND_NAMES[kind]} titles yet.</p>
        <Link href="/settings/categories" className="flex min-h-11 items-center text-13 text-accent underline-offset-3 hover:underline md:min-h-0">
          Make one
        </Link>
      </Box>
    );
  }

  function add(target: ViewerShelf) {
    startTransition(async () => {
      const result = await copySharedTitles({ access, itemIds: [title.id], categoryId: target.id, status });
      if (!result.ok) return void toast.error(result.message);
      const made = result.added[0];
      if (!made) return void toast.message("That's on your shelves already.");
      onAdded({ item: made.item, shelf: target.id });
      toast.success(`Added ${title.title} to your ${target.name}.`, {
        action: { label: "Open", onClick: () => router.push(copyHref(target, made.item)) },
      });
    });
  }

  return (
    <Box stacked>
      {shelves.length > 1 && <ShelfChoice shelves={shelves} value={shelf.id} onChange={setShelfId} name={`shelf-${title.id}`} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusStepper kind={labelKind(kind, title.format)} value={status} onStep={(direction) => setStatus(stepStatus(status, direction))} />
        <Button onClick={() => add(shelf)} disabled={pending} aria-busy={pending} size="sm" className="h-11 grow gap-1.5 shadow-cta-sm sm:grow-0 md:h-9">
          <Plus aria-hidden className="size-3.5" strokeWidth={2.4} />
          {pending ? "Adding" : `Add to ${shelf.name}`}
        </Button>
      </div>
    </Box>
  );
}

function Box({ stacked = false, children }: { stacked?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mx-5.5 mt-5 flex rounded-card border border-white/8 bg-surface px-3.5 py-3 md:mx-6.5",
        stacked ? "flex-col gap-3" : "flex-wrap items-center justify-between gap-x-3 gap-y-1",
      )}
    >
      {children}
    </div>
  );
}
