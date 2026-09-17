import { redirect } from "next/navigation";

/** SPEC §8.10 lands on Profile; until that tab exists, Categories is the first one. */
export default function SettingsPage() {
  redirect("/settings/categories");
}
