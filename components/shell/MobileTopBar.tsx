import Link from "next/link";
import { UserMenu, type MenuUser } from "@/components/user/UserMenu";
import type { CategoryWithCount } from "@/lib/queries";
import { BrandMark } from "./BrandMark";
import { MobileListsMenu } from "./MobileListsMenu";

/**
 * Phone header (handoff §08). The Lists menu stands in for the bottom nav
 * (Phase 4); search arrives with the palette (Phase 3).
 */
type MobileTopBarProps = { user: MenuUser; categories: CategoryWithCount[]; dim: boolean };

export function MobileTopBar({ user, categories, dim }: MobileTopBarProps) {
  return (
    <header className="relative z-40 flex items-center justify-between px-5 pt-5 md:hidden">
      <Link href="/home" className="rounded-nav" aria-label="Marquee home">
        <BrandMark variant="mobile" dim={dim} />
      </Link>
      <div className="flex items-center gap-2">
        <MobileListsMenu categories={categories} />
        <UserMenu user={user} variant="compact" />
      </div>
    </header>
  );
}
