"use client";

import { ChevronUp } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useTransition } from "react";
import { signOut, switchAccount } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

export type MenuUser = {
  displayName: string;
  username: string | null;
  email: string | null;
  /** Uploaded or Google photo; initials when null. */
  avatarUrl: string | null;
};

type UserMenuProps = {
  user: MenuUser;
  /** `chip` sits at the foot of the sidebar; `compact` is the avatar button on phones. */
  variant: "chip" | "compact";
};

/** The account menu (SPEC §8.3): Profile, Settings, Switch account, Sign out. */
export function UserMenu({ user, variant }: UserMenuProps) {
  const [pending, startTransition] = useTransition();
  const chip = variant === "chip";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {chip ? (
          <button
            type="button"
            className="group flex w-full items-center gap-2.5 rounded-[9px] border border-transparent px-2.25 py-2 text-left transition-colors hover:bg-white/5 data-[state=open]:border-white/12 data-[state=open]:bg-white/5"
          >
            <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] leading-[1.2] font-medium">
                {user.displayName}
              </span>
              {user.username && (
                <span className="mt-0.5 block truncate font-mono text-[10.5px] text-text-muted">
                  @{user.username}
                </span>
              )}
            </span>
            <ChevronUp
              aria-hidden
              className="size-3.25 shrink-0 text-text-muted transition-transform group-data-[state=open]:rotate-180"
              strokeWidth={2.2}
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Account menu"
            className="rounded-full outline-offset-2 transition-opacity hover:opacity-90"
          >
            <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={chip ? "top" : "bottom"}
          align={chip ? "start" : "end"}
          sideOffset={8}
          className={cn(
            "z-50 overflow-hidden rounded-[13px] border border-white/10 bg-menu shadow-menu",
            chip ? "w-(--radix-dropdown-menu-trigger-width)" : "w-62",
          )}
        >
          <div className="flex items-center gap-2.75 border-b border-border px-3.5 pt-3.5 pb-3.25">
            <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{user.displayName}</p>
              {user.username && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
                  @{user.username}
                </p>
              )}
              {user.email && (
                <p className="mt-0.75 truncate text-[11px] text-text-muted">{user.email}</p>
              )}
            </div>
          </div>

          <div className="p-1.5">
            <LinkItem href="/settings/profile" tall={!chip}>
              Profile
            </LinkItem>
            <LinkItem href="/settings/categories" tall={!chip}>
              Settings
            </LinkItem>
            <MenuItem tall={!chip} disabled={pending} onSelect={() => startTransition(() => switchAccount())}>
              Switch account
            </MenuItem>
            <DropdownMenu.Separator className="mx-2.5 my-1.5 h-px bg-border" />
            <MenuItem tall={!chip} danger disabled={pending} onSelect={() => startTransition(() => signOut())}>
              Sign out
            </MenuItem>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({
  children,
  danger = false,
  tall = false,
  disabled,
  onSelect,
}: {
  children: string;
  danger?: boolean;
  /** Phone menus need 44px rows (SPEC §8.3). */
  tall?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.25 rounded-nav px-2.5 py-2.25 text-13 outline-none select-none data-disabled:cursor-wait data-disabled:opacity-60",
        tall && "min-h-11",
        danger
          ? "text-dropped-muted data-highlighted:bg-dropped-muted/12 data-highlighted:text-dropped"
          : "text-text data-highlighted:bg-white/5",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.25 rounded-full", danger ? "bg-dropped-muted" : "bg-white/28")}
      />
      {children}
    </DropdownMenu.Item>
  );
}

function LinkItem({ href, tall, children }: { href: string; tall: boolean; children: string }) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className={cn(
          "flex cursor-pointer items-center gap-2.25 rounded-nav px-2.5 py-2.25 text-13 text-text outline-none select-none data-highlighted:bg-white/5",
          tall && "min-h-11",
        )}
      >
        <span aria-hidden className="size-1.25 rounded-full bg-white/28" />
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}
