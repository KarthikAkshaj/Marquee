import Link from "next/link";
import { PaletteTrigger } from "@/components/palette/PaletteTrigger";
import { BrandMark } from "./BrandMark";

/**
 * Phone header (handoff §08): the mark and search. Shelves, adding and the
 * account menu live in the bottom nav.
 */
export function MobileTopBar({ dim }: { dim: boolean }) {
  return (
    <header className="relative z-40 flex items-center justify-between px-5 pt-5 md:hidden">
      <Link href="/home" className="rounded-nav" aria-label="Marquee home">
        <BrandMark variant="mobile" dim={dim} />
      </Link>
      <PaletteTrigger variant="icon" />
    </header>
  );
}
