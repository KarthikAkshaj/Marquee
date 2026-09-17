"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/user/Avatar";
import { removeAvatar } from "@/lib/actions/profile";
import { AVATAR_TYPES } from "@/lib/profile";
import { AvatarCropDialog } from "./AvatarCropDialog";

/** The picked file only feeds the cropper; what's uploaded is a 512px square well under the bucket's 2 MB. */
const PICK_MAX_BYTES = 15 * 1024 * 1024;

type AvatarUploaderProps = { name: string; avatarUrl: string | null };

/** Large avatar with Change photo and Remove (SPEC §8.10, handoff §07). */
export function AvatarUploader({ name, avatarUrl }: AvatarUploaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, startRemoving] = useTransition();

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(file.type in AVATAR_TYPES)) return setError("Use a PNG, JPEG or WebP image.");
    if (file.size > PICK_MAX_BYTES) return setError("That photo is over 15 MB. Try a smaller one.");
    setError(null);
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && setSource(reader.result);
    reader.onerror = () => setError("Couldn't read that image.");
    reader.readAsDataURL(file);
  }

  function remove() {
    setConfirming(false);
    startRemoving(async () => {
      const result = await removeAvatar();
      if (result.ok) toast.success("Back to initials.");
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex items-center gap-4.5 md:gap-6">
      <div className="relative shrink-0">
        <div aria-hidden className="glow-amber absolute -inset-3.5 rounded-full blur-[14px] md:-inset-4.5 md:blur-[16px]" />
        <Avatar name={name} src={avatarUrl} size="xl" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="hidden max-w-82.5 text-13 text-pretty text-text-muted md:block">
          {avatarUrl
            ? "Looking good. Swap it whenever the mood changes."
            : "No photo yet, so we made one out of your initials. It beats a grey silhouette."}
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2.5">
          <Button variant="secondary" onClick={() => input.current?.click()} className="h-11 px-4 text-13 md:h-10">
            Change photo
          </Button>
          {avatarUrl && (
            <Button
              variant="ghost"
              onClick={() => setConfirming(true)}
              disabled={removing}
              className="h-11 px-3.5 text-13 hover:text-dropped-muted md:h-10"
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-12 text-dropped">
            {error}
          </p>
        )}
        <input
          ref={input}
          type="file"
          accept={Object.keys(AVATAR_TYPES).join(",")}
          onChange={pick}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      </div>

      <AvatarCropDialog source={source} onClose={() => setSource(null)} />
      <ConfirmDialog
        open={confirming}
        title={
          <>
            Remove your <em className="text-dropped">photo?</em>
          </>
        }
        description="Your initials take its place. You can add a new one any time."
        cancelLabel="Keep it"
        confirmLabel="Remove"
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </div>
  );
}
