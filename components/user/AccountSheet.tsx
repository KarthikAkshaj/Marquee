"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { signOut, switchAccount } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import type { MenuUser } from "./UserMenu";

type AccountSheetProps = {
  user: MenuUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const row = "flex min-h-12 w-full items-center gap-3 rounded-nav px-3 text-14 transition-colors hover:bg-white/5 disabled:cursor-wait disabled:opacity-60";

function Dot({ danger = false }: { danger?: boolean }) {
  return <span aria-hidden className={cn("size-1.5 rounded-full", danger ? "bg-dropped-muted" : "bg-white/28")} />;
}

function LinkRow({ href, onGo, children }: { href: string; onGo: () => void; children: ReactNode }) {
  return (
    <Link href={href} onClick={onGo} className={cn(row, "text-text")}>
      <Dot />
      {children}
    </Link>
  );
}

/** The account menu as a phone sheet (SPEC §8.3): the same four choices as the sidebar's user chip. */
export function AccountSheet({ user, open, onOpenChange }: AccountSheetProps) {
  const [pending, startTransition] = useTransition();
  const close = () => onOpenChange(false);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Account" hideTitle description="Your profile, settings and sign out.">
      <div className="flex items-center gap-3 border-b border-border px-3 pt-1 pb-4">
        <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-16 font-medium">{user.displayName}</p>
          {user.username && <p className="truncate font-mono text-[11.5px] text-text-muted">@{user.username}</p>}
          {user.email && <p className="truncate text-12 text-text-muted">{user.email}</p>}
        </div>
      </div>
      <div className="flex flex-col pt-2">
        <LinkRow href="/settings/profile" onGo={close}>
          Profile
        </LinkRow>
        <LinkRow href="/settings/categories" onGo={close}>
          Settings
        </LinkRow>
        <button type="button" disabled={pending} onClick={() => startTransition(() => switchAccount())} className={cn(row, "text-text")}>
          <Dot />
          Switch account
        </button>
        <span aria-hidden className="mx-3 my-1.5 h-px bg-border" />
        <button type="button" disabled={pending} onClick={() => startTransition(() => signOut())} className={cn(row, "text-dropped-muted hover:bg-dropped-muted/12 hover:text-dropped")}>
          <Dot danger />
          Sign out
        </button>
      </div>
    </BottomSheet>
  );
}
