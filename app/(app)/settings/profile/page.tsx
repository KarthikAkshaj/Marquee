import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { SharingCard } from "@/components/settings/SharingCard";
import { getProfile, getSharing } from "@/lib/queries";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Profile" };

/** Photo, display name, username, bio and a few stats (SPEC §8.10), then what you share (SPEC §19). */
export default async function ProfileSettingsPage() {
  const [profile, sharing] = await Promise.all([getProfile(), getSharing()]);
  return (
    <div className="flex flex-col gap-7">
      {/* Keyed by what's saved, so the form starts fresh after a save changes it. */}
      <ProfileForm key={`${profile.username}:${profile.display_name}:${profile.bio}`} profile={profile} />
      <SharingCard {...sharing} link={sharing.username ? `${siteUrl()}/u/${sharing.username}` : null} />
    </div>
  );
}
