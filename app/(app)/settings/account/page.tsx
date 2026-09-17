import type { Metadata } from "next";
import { DangerZone } from "@/components/settings/DangerZone";
import { EmailCard } from "@/components/settings/EmailCard";
import { getAccount } from "@/lib/queries";

export const metadata: Metadata = { title: "Account" };

/** Email and sign-in, switching and signing out, and deleting the account (SPEC §8.10). */
export default async function AccountSettingsPage({ searchParams }: PageProps<"/settings/account">) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);

  return (
    <div className="flex flex-col gap-7">
      <EmailCard
        email={account.email}
        pendingEmail={account.pendingEmail}
        signsInWith={account.signsInWith}
        halfConfirmed={params.notice === "email-half-confirmed"}
      />
      <DangerZone username={account.username} titleCount={account.titleCount} categoryCount={account.categoryCount} />
    </div>
  );
}
