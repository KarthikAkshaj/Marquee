"use client";

import { House, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { usePalette } from "@/components/palette/PaletteProvider";
import { AccountSheet } from "@/components/user/AccountSheet";
import { Avatar } from "@/components/user/Avatar";
import type { MenuUser } from "@/components/user/UserMenu";
import type { CategoryWithCount } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ListsSheet } from "./ListsSheet";

type MobileBottomNavProps = { categories: CategoryWithCount[]; user: MenuUser };

/** Pages with their own bar along the bottom, where the nav would sit on top of it. */
const FOCUSED = [/^\/c\/[^/]+\/match$/, /^\/import$/];

const tab =
  "flex min-h-11 flex-1 flex-col items-center justify-center gap-1.25 rounded-nav text-[10px] text-text-muted transition-colors hover:text-text aria-[current=page]:text-accent data-[active=true]:text-accent";

function TabBody({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      <span aria-hidden className="grid h-5 place-items-center">
        {icon}
      </span>
      {label}
    </>
  );
}

/**
 * The phone's bottom nav (SPEC §8.3, handoff §08): Home, the Categories sheet,
 * a raised + that adds to the shelf you're on, and You (the account sheet).
 */
export function MobileBottomNav({ categories, user }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { add } = usePalette();
  const [sheet, setSheet] = useState<"lists" | "account" | null>(null);

  if (FOCUSED.some((pattern) => pattern.test(pathname))) return null;

  const onShelf = pathname.startsWith("/c/");
  const inSettings = pathname.startsWith("/settings");
  const closeSheet = (open: boolean) => !open && setSheet(null);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-white/8 bg-sunken/90 px-3 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur-[18px] md:hidden"
      >
        <Link href="/home" aria-current={pathname === "/home" ? "page" : undefined} className={tab}>
          <TabBody icon={<House className="size-5" strokeWidth={1.9} />} label="Home" />
        </Link>
        <button type="button" onClick={() => setSheet("lists")} aria-haspopup="dialog" data-active={onShelf} className={tab}>
          <TabBody icon={<LayoutGrid className="size-5" strokeWidth={1.9} />} label="Categories" />
        </button>
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={add}
            aria-label={onShelf ? "Add a title to this shelf" : "Search or add a title"}
            className="-mt-7.5 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-fab transition-colors hover:bg-accent-hover active:scale-95 motion-reduce:active:scale-100"
          >
            <Plus aria-hidden className="size-6.5" strokeWidth={2.2} />
          </button>
        </div>
        <button type="button" onClick={() => setSheet("account")} aria-haspopup="dialog" data-active={inSettings} className={tab}>
          <TabBody
            icon={
              <span className={cn("rounded-full", inSettings && "ring-1 ring-accent ring-offset-2 ring-offset-sunken")}>
                <Avatar name={user.displayName} src={user.avatarUrl} size="xs" />
              </span>
            }
            label="You"
          />
        </button>
      </nav>
      <ListsSheet categories={categories} open={sheet === "lists"} onOpenChange={closeSheet} />
      <AccountSheet user={user} open={sheet === "account"} onOpenChange={closeSheet} />
    </>
  );
}
