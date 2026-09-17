import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PaletteProvider } from "@/components/palette/PaletteProvider";
import { MobileTopBar } from "@/components/shell/MobileTopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { getCategories, getViewer } from "@/lib/queries";

// Only the landing page is indexable (SPEC §11).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [viewer, categories] = await Promise.all([getViewer(), getCategories()]);

  const user = {
    displayName: viewer.profile?.display_name ?? viewer.profile?.username ?? viewer.email ?? "You",
    username: viewer.profile?.username ?? null,
    email: viewer.email,
    avatarUrl: viewer.profile?.avatar_url ?? null,
  };
  // Nothing tracked anywhere yet: the marquee's lights are down.
  const dim = categories.every((category) => category.itemCount === 0);
  const shelves = categories.map(({ id, name, slug, color, icon, kind }) => ({ id, name, slug, color, icon, kind }));

  return (
    <PaletteProvider categories={shelves}>
      <div className="flex min-h-dvh">
        <Sidebar categories={categories} user={user} dim={dim} />
        <div className="relative z-2 flex min-w-0 flex-1 flex-col">
          <MobileTopBar user={user} categories={categories} dim={dim} />
          <main className="flex flex-1 flex-col px-5 pt-6.5 pb-10 md:px-10 md:pt-8.5">
            {children}
          </main>
        </div>
      </div>
    </PaletteProvider>
  );
}
