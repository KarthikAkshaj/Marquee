"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { StatusStepper } from "@/components/add/StatusStepper";
import { Button } from "@/components/ui/Button";
import { addSharedTitle } from "@/lib/actions/shared";
import { KIND_NAMES } from "@/lib/categories";
import type { PublicTitle, ViewerCopy, ViewerShelf } from "@/lib/public-profile";
import { labelKind, stepStatus, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

type AddToMyShelfProps = {
  title: PublicTitle;
  /** Whose shelf it's on. */
  username: string;
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

const itemHref = (shelf: ViewerShelf, item: string) => `/c/${encodeURIComponent(shelf.slug)}?item=${item}`;

/**
 * The foot of a shared title's card (SPEC §19): put it on your own shelf in a
 * status you pick, or see that it's there already. Signed out, it's the way in.
 */
export function AddToMyShelf({ title, username, kind, signInHref, shelves, copy, onAdded }: AddToMyShelfProps) {
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
          <Link href={itemHref(home, copy.item)} className="flex min-h-11 items-center text-13 text-accent underline-offset-3 hover:underline md:min-h-0">
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
      const result = await addSharedTitle({ username, itemId: title.id, categoryId: target.id, status });
      if (!result.ok) return void toast.error(result.message);
      onAdded({ item: result.id, shelf: target.id });
      toast.success(`Added ${title.title} to your ${target.name}.`, {
        action: { label: "Open", onClick: () => router.push(itemHref(target, result.id)) },
      });
    });
  }

  return (
    <Box stacked>
      {shelves.length > 1 && (
        <div role="radiogroup" aria-label="Which shelf" className="flex flex-wrap gap-1.5">
          {shelves.map((candidate) => (
            <label
              key={candidate.id}
              className={cn(
                "press flex h-11 cursor-pointer items-center rounded-full border px-3.5 text-[12.5px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent md:h-8",
                candidate.id === shelf.id ? "border-accent/45 bg-accent/10 font-semibold text-text" : "border-white/8 bg-elevated text-text-muted hover:text-text",
              )}
            >
              <input
                type="radio"
                name={`shelf-${title.id}`}
                value={candidate.id}
                checked={candidate.id === shelf.id}
                onChange={() => setShelfId(candidate.id)}
                className="sr-only"
              />
              {candidate.name}
            </label>
          ))}
        </div>
      )}
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
