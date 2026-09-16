import Link from "next/link";
import { UserMenu, type MenuUser } from "@/components/user/UserMenu";
import { BrandMark } from "./BrandMark";

/**
 * Phone header (handoff §08). Search and the bottom nav arrive with their
 * features (SPEC §14, Phases 3–4).
 */
export function MobileTopBar({ user, dim }: { user: MenuUser; dim: boolean }) {
  return (
    <header className="relative z-40 flex items-center justify-between px-5 pt-5 md:hidden">
      <Link href="/home" className="rounded-nav" aria-label="Marquee home">
        <BrandMark variant="mobile" dim={dim} />
      </Link>
      <UserMenu user={user} variant="compact" />
    </header>
  );
}
