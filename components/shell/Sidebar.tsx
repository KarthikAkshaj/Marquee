import Link from "next/link";
import { PaletteTrigger } from "@/components/palette/PaletteTrigger";
import { UserMenu } from "@/components/user/UserMenu";
import { categoryStyle } from "@/lib/categories";
import type { CategoryWithCount } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { NavLink } from "./NavLink";
import type { MenuUser } from "@/components/user/UserMenu";

type SidebarProps = {
  categories: CategoryWithCount[];
  user: MenuUser;
  /** Nothing tracked yet: the whole sidebar dims, lights-down. */
  dim: boolean;
};

/**
 * Desktop sidebar (SPEC §8.3, handoff §01). Import joins it in Phase 4, so
 * nothing here leads nowhere.
 */
export function Sidebar({ categories, user, dim }: SidebarProps) {
  return (
    <aside className="sticky top-0 z-2 hidden h-dvh w-62 shrink-0 flex-col gap-6.5 border-r border-border bg-bg/60 px-4.5 py-6.5 md:flex">
      <Link href="/home" className="rounded-nav px-2" aria-label="Marquee home">
        <BrandMark variant="sidebar" dim={dim} />
      </Link>

      <nav aria-label="Main" className="flex min-h-0 flex-col gap-0.75 overflow-y-auto">
        <NavLink
          href="/home"
          className={cn(
            "flex items-center gap-2.5 rounded-nav px-2.5 py-2.25 text-[13.5px] text-text-muted transition-colors hover:text-text",
            "aria-[current=page]:font-medium aria-[current=page]:text-accent",
            dim ? "aria-[current=page]:bg-accent/10" : "aria-[current=page]:bg-accent/12",
          )}
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-text-muted group-aria-[current=page]:bg-accent"
          />
          Home
        </NavLink>

        <p id="lists-heading" className="label-mono px-2.5 pt-4 pb-1.5 text-text-muted">
          Lists
        </p>
        <ul aria-labelledby="lists-heading" className="flex flex-col gap-0.75">
          {categories.map((category) => {
            const style = categoryStyle(category.color);
            return (
              <li key={category.id}>
                <NavLink
                  href={`/c/${category.slug}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-nav px-2.5 py-2.25 text-[13.5px] transition-colors hover:bg-white/4 aria-[current=page]:font-semibold",
                    style.activeBg,
                    dim ? "text-text-muted" : "text-text",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.75 shrink-0 rounded-full",
                      dim ? style.dotDim : [style.dot, style.glow],
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  <span
                    className={cn(
                      "font-mono text-[11.5px]",
                      dim ? "text-text-faint" : "text-text-muted",
                    )}
                  >
                    {dim ? <span aria-label="empty">—</span> : category.itemCount}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
        <Link
          href="/settings/categories?new=1"
          className="flex items-center gap-2.5 rounded-nav px-2.5 py-2.25 text-13 text-text-muted transition-colors hover:text-text"
        >
          <span aria-hidden className="size-1.75 shrink-0 rounded-full border border-dashed border-white/30" />
          New category
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3.5">
        <PaletteTrigger variant="sidebar" dim={dim} />
        <NavLink
          href="/settings"
          className="rounded-nav px-2.5 py-2 text-13 text-text-muted transition-colors hover:text-text aria-[current=page]:bg-accent/12 aria-[current=page]:font-medium aria-[current=page]:text-accent"
        >
          Settings
        </NavLink>
        <div className="mt-2.5 border-t border-border pt-2.5">
          <UserMenu user={user} variant="chip" />
        </div>
      </div>
    </aside>
  );
}
