import { redirect } from "next/navigation";

/** Settings opens on Profile (SPEC §8.10). */
export default function SettingsPage() {
  redirect("/settings/profile");
}
