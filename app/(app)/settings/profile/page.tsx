import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { getProfile } from "@/lib/queries";

export const metadata: Metadata = { title: "Profile" };

/** Photo, display name, username, bio and a few stats (SPEC §8.10). */
export default async function ProfileSettingsPage() {
  const profile = await getProfile();
  // Keyed by what's saved, so the form starts fresh after a save changes it.
  return <ProfileForm key={`${profile.username}:${profile.display_name}:${profile.bio}`} profile={profile} />;
}
