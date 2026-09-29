"use client";

import { useState } from "react";
import { toast } from "sonner";
import { announceAdded } from "@/components/add/announceAdded";
import { addFromSearch, deleteItem } from "@/lib/actions/items";
import { dismissPick, restorePick } from "@/lib/actions/picks";
import { newItemId } from "@/lib/add";
import type { PickShelf, PickView } from "@/lib/recommend";
import type { PlanState } from "./NewPickCard";

const IDLE: PlanState = { status: "idle" };

/**
 * "Plan it" and "Not for me" on For you's new titles (SPEC §20), both at once
 * on screen and both with Undo. Kept by title, so a title planned under one
 * mood shows as planned under the next.
 */
export function usePickActions() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [plans, setPlans] = useState<ReadonlyMap<string, PlanState>>(() => new Map());

  const hide = (key: string, gone: boolean) =>
    setHidden((current) => {
      const next = new Set(current);
      if (gone) next.add(key);
      else next.delete(key);
      return next;
    });
  const setPlan = (key: string, state: PlanState) => setPlans((current) => new Map(current).set(key, state));

  async function plan(pick: PickView, home: PickShelf) {
    const { result } = pick;
    setPlan(pick.key, { status: "adding" });
    const id = newItemId();
    const saved = await addFromSearch({ id, categoryId: home.id, status: "planned", result });
    if (!saved.ok) {
      setPlan(pick.key, IDLE);
      toast.error(saved.message);
      return;
    }
    setPlan(pick.key, { status: "planned", id });
    const item = { id, title: result.title, cover_url: result.coverUrl ?? null, accent_color: result.accentColor ?? null };
    announceAdded(item, home.name, () => {
      void deleteItem(id).then((removed) => {
        if (!removed.ok) return void toast.error(removed.message);
        setPlan(pick.key, IDLE);
        toast.success(`Removed ${result.title}.`);
      });
    });
  }

  async function dismiss(pick: PickView) {
    const key = { source: pick.result.source, externalId: pick.result.externalId };
    hide(pick.key, true);
    const saved = await dismissPick({ ...key, genres: pick.result.genres ?? [], tags: pick.result.tags ?? [] });
    if (!saved.ok) {
      hide(pick.key, false);
      toast.error(saved.message);
      return;
    }
    toast.success(`${pick.result.title} won't come up again.`, {
      action: {
        label: "Undo",
        onClick: () => {
          void restorePick(key).then((restored) => (restored.ok ? hide(pick.key, false) : toast.error(restored.message)));
        },
      },
    });
  }

  return { hidden, stateOf: (key: string) => plans.get(key) ?? IDLE, plan, dismiss };
}
