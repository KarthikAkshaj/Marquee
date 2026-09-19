"use client";

import { Loader2 } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { uploadAvatar } from "@/lib/actions/profile";
import { cropAvatar } from "@/lib/image/crop-avatar";
import { useReturnFocus } from "@/lib/use-return-focus";

type AvatarCropDialogProps = {
  /** The picked photo as a data URL; null keeps the dialog closed. */
  source: string | null;
  onClose: () => void;
};

/** "Crop your photo" (handoff §07): drag to frame, zoom, then upload a 512px square. */
export function AvatarCropDialog({ source, onClose }: AvatarCropDialogProps) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={source !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <Dialog.Content onOpenAutoFocus={returnFocus.remember} onCloseAutoFocus={returnFocus.restore} className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-101 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-tile border border-white/10 bg-sheet shadow-modal">
          {source && <CropForm source={source} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CropForm({ source, onClose }: { source: string; onClose: () => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function savePhoto() {
    if (!area) return;
    setError(null);
    startTransition(async () => {
      try {
        const blob = await cropAvatar(source, area);
        const form = new FormData();
        form.append("avatar", new File([blob], blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type: blob.type }));
        const result = await uploadAvatar(form);
        if (!result.ok) return setError(result.message);
        toast.success("Looking sharp.");
        onClose();
      } catch {
        setError("Couldn't prepare that photo. Try another one.");
      }
    });
  }

  return (
    <>
      <div className="border-b border-border px-5 pt-4.5 pb-3.5">
        <Dialog.Title className="font-display text-28 leading-[1.1]">Crop your photo</Dialog.Title>
        <Dialog.Description className="mt-1.25 text-12 text-text-muted">
          Square, because round avatars are just squares with better manners.
        </Dialog.Description>
      </div>

      <div className="flex flex-col gap-3.5 px-5 py-4.5">
        <div className="relative aspect-square w-full overflow-hidden rounded-card bg-surface">
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={1}
            minZoom={1}
            maxZoom={3}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            classes={{ cropAreaClassName: "border-accent/90! text-scrim/55!" }}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <span className="label-mono tracking-[.12em] text-text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-11 min-w-0 flex-1 cursor-pointer accent-accent"
          />
          <span className="w-9 text-right font-mono text-[11.5px]">{zoom.toFixed(1)}×</span>
        </label>
        {error && (
          <p role="alert" className="text-13 text-dropped">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/40 px-5 py-3.5">
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" className="h-11 px-4 text-13 md:h-9.5">
            Cancel
          </Button>
        </Dialog.Close>
        <Button onClick={savePhoto} disabled={!area || pending} aria-busy={pending} className="h-11 px-4.5 text-13 shadow-cta-sm md:h-9.5">
          {pending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
          {pending ? "Uploading…" : "Use photo"}
        </Button>
      </div>
    </>
  );
}
