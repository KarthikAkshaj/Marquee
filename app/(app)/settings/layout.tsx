import type { Metadata } from "next";
import { LegalLinks } from "@/components/marketing/LegalLinks";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { getCategories } from "@/lib/queries";

export const metadata: Metadata = {
  title: { default: "Settings", template: "%s · Settings · Marquee" },
};

/** Settings shell (SPEC §8.10, handoff §07): serif heading, tabs, then the page. */
export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const categories = await getCategories();

  return (
    <>
      <AmbientBackground variant="app" />
      <header>
        <p className="label-mono mb-2.25 text-[11px] text-text-muted">Account</p>
        <h1 className="font-display text-[40px] leading-none md:text-[46px]">Settings</h1>
      </header>
      <div className="mt-6 flex flex-col gap-6 md:mt-7.5 md:flex-row md:gap-8.5">
        <SettingsTabs
          tabs={[
            // No count on Profile (SPEC §8.10 design overrides).
            { href: "/settings/profile", label: "Profile" },
            { href: "/settings/categories", label: "Categories", meta: String(categories.length).padStart(2, "0") },
            { href: "/settings/data", label: "Data" },
            { href: "/settings/account", label: "Account" },
          ]}
        />
        <div className="min-w-0 flex-1 pb-10 md:max-w-180">
          {children}
          <LegalLinks className="mt-12 border-t border-border pt-2 md:pt-4" />
        </div>
      </div>
    </>
  );
}
