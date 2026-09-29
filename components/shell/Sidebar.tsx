import Link from "next/link";
import { PaletteTrigger } from "@/components/palette/PaletteTrigger";
import { UserMenu } from "@/components/user/UserMenu";
import { categoryStyle } from "@/lib/categories";
import type { CategoryWithCount } from "@/lib/queries";
import { ArrivalList } from "@/components/ui/ArrivalList";
import { GlideGroup } from "@/components/ui/Glide";
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
 * Desktop sidebar (SPEC §8.3, handoff §01): home, your lists, then search,
 * import and settings above the user chip.
 */
export function Sidebar({ categories, user, dim }: SidebarProps) {
  return (
    <aside className="sticky top-0 z-2 hidden h-dvh w-62 shrink-0 flex-col gap-6.5 border-r border-border bg-bg/60 px-4.5 py-6.5 md:flex">
      <Link href="/home" className="rounded-nav px-2" aria-label="Marquee home">
        <BrandMark variant="sidebar" dim={dim} />
      </Link>

      <nav aria-label="Main" className="flex min-h-0 flex-col overflow-y-auto">
        <GlideGroup id="sidebar-main" className="flex flex-col gap-0.75">
          {[
            { href: "/home", label: "Home" },
            { href: "/for-you", label: "For you" },
            { href: "/stats", label: "Stats" },
          ].map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              pill={dim ? "bg-accent/10" : "bg-accent/12"}
              className="flex items-center gap-2.5 rounded-nav px-2.5 py-2.25 text-[13.5px] text-text-muted transition-colors hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-accent"
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-text-muted group-aria-[current=page]:bg-accent"
              />
              {link.label}
            </NavLink>
          ))}

          <p id="lists-heading" className="label-mono px-2.5 pt-4 pb-1.5 text-text-muted">
            Lists
          </p>
          {/* A category made while you're here switches on in its place (U35). */}
          <ArrivalList aria-labelledby="lists-heading" className="flex flex-col gap-0.75">
            {categories.map((category) => {
              const style = categoryStyle(category.color);
              return (
                <li key={category.id} data-arrival={category.id}>
                  <NavLink
                    href={`/c/${category.slug}`}
                    pill={style.pill}
                    className={cn(
                      "flex items-center gap-2.5 rounded-nav px-2.5 py-2.25 text-[13.5px] transition-colors aria-[current=page]:font-semibold",
                      dim ? "text-text-muted" : "text-text",
                    )}
                  >
                    <span
                      aria-hidden
                      data-arrival-dot
                      className={cn(
                        "size-1.75 shrink-0 rounded-full",
                        dim ? style.dotDim : [style.dot, style.glow],
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <span
                      className={cn(
                        "font-mono text-[11.5px]",
                        "text-text-muted",
                      )}
                    >
                      {dim ? <span aria-label="empty">·</span> : category.itemCount}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ArrivalList>
          <Link
            href="/settings/categories?new=1"
            className="flex items-center gap-2.5 rounded-nav px-2.5 py-2.25 text-13 text-text-muted transition-colors hover:text-text"
          >
            <span aria-hidden className="size-1.75 shrink-0 rounded-full border border-dashed border-white/30" />
            New category
          </Link>
        </GlideGroup>
      </nav>

      <GlideGroup id="sidebar-tools" className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3.5">
        <PaletteTrigger variant="sidebar" dim={dim} />
        <NavLink
          href="/import"
          pill="bg-accent/12"
          className="rounded-nav px-2.5 py-2 text-13 text-text-muted transition-colors hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-accent"
        >
          Import
        </NavLink>
        {/* Straight to Profile: /settings only redirects there, a round trip for nothing. */}
        <NavLink
          href="/settings/profile"
          match="/settings"
          pill="bg-accent/12"
          className="rounded-nav px-2.5 py-2 text-13 text-text-muted transition-colors hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-accent"
        >
          Settings
        </NavLink>
        <div className="mt-2.5 border-t border-border pt-2.5">
          <UserMenu user={user} />
        </div>
      </GlideGroup>
    </aside>
  );
}
