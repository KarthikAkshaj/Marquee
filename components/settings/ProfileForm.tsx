"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { updateProfile } from "@/lib/actions/profile";
import { BIO_MAX, DISPLAY_NAME_MAX } from "@/lib/profile";
import type { Profile } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { AvatarUploader } from "./AvatarUploader";
import { ProfileStats } from "./ProfileStats";
import { SaveBar } from "./SaveBar";
import { UsernameField } from "./UsernameField";
import { useUsernameCheck } from "./useUsernameCheck";

type Fields = { display_name: string; username: string; bio: string };

const tidy = (fields: Fields): Fields => ({
  display_name: fields.display_name.trim(),
  username: fields.username.trim(),
  bio: fields.bio.trim(),
});

/** Settings → Profile (SPEC §8.10). The photo saves on its own; the fields wait for Save. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const saved: Fields = { display_name: profile.display_name ?? "", username: profile.username, bio: profile.bio ?? "" };
  const [values, setValues] = useState<Fields>(saved);
  const [saving, startSaving] = useTransition();
  const username = useUsernameCheck(values.username, profile.username);

  const clean = tidy(values);
  const dirty = (Object.keys(saved) as (keyof Fields)[]).some((key) => clean[key] !== saved[key]);
  const canSave =
    clean.display_name.length > 0 && (username.status === "unchanged" || username.status === "available" || username.status === "unknown");
  const set = (key: keyof Fields) => (value: string) => setValues((current) => ({ ...current, [key]: value }));

  // Leaving with unsaved edits gets the browser's own "are you sure?".
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    startSaving(async () => {
      const result = await updateProfile(clean);
      if (!result.ok) return void toast.error(result.message);
      setValues(clean);
      toast.success("Saved. Looking like you.");
    });
  }

  const bioLeft = BIO_MAX - values.bio.length;

  return (
    <div className="flex flex-col gap-7 pb-24">
      <AvatarUploader name={clean.display_name || profile.username} avatarUrl={profile.avatar_url} />

      <div className="flex flex-col gap-4.5">
        <div>
          <label htmlFor="profile-name" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
            Display name
          </label>
          <Input
            id="profile-name"
            value={values.display_name}
            maxLength={DISPLAY_NAME_MAX}
            autoComplete="name"
            aria-invalid={clean.display_name ? undefined : true}
            onChange={(event) => set("display_name")(event.target.value)}
          />
          {!clean.display_name && <p className="mt-1.75 text-[11.5px] text-dropped-muted">Give yourself a name.</p>}
        </div>

        <UsernameField value={values.username} state={username} onChange={set("username")} />

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="profile-bio" className="label-mono tracking-[.12em] text-text-muted">
              Bio
            </label>
            <span
              aria-live="polite"
              className={cn("font-mono text-[11px]", bioLeft <= 0 ? "text-dropped" : bioLeft <= 20 ? "text-accent" : "text-text-muted")}
            >
              {bioLeft}
            </span>
          </div>
          <textarea
            id="profile-bio"
            value={values.bio}
            maxLength={BIO_MAX}
            rows={3}
            placeholder="Three shows you'd defend to the end."
            onChange={(event) => set("bio")(event.target.value)}
            className="block h-19 w-full resize-none rounded-card border border-white/9 bg-surface px-3.5 py-3 text-[13.5px] leading-[1.55] text-text transition-[border-color,box-shadow] placeholder:text-text-faint focus-visible:border-accent/40 focus-visible:shadow-input-focus focus-visible:outline-none md:h-20.5"
          />
        </div>
      </div>

      <ProfileStats stats={profile.stats} />

      <SaveBar visible={dirty} canSave={canSave} saving={saving} onDiscard={() => setValues(saved)} onSave={save} />
    </div>
  );
}
