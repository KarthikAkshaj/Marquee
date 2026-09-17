import type { Area } from "react-easy-crop";

const SIZE = 512;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't read that image."));
    image.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * The cropped square scaled to 512×512 in the browser (SPEC §8.10), so only a
 * small file is uploaded. WebP where the browser can encode it (some Safari
 * versions quietly hand back PNG), JPEG otherwise.
 */
export async function cropAvatar(src: string, area: Area): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn't prepare that image.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, SIZE, SIZE);

  const webp = await toBlob(canvas, "image/webp", 0.88);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", 0.9);
  if (!jpeg) throw new Error("Couldn't prepare that image.");
  return jpeg;
}
