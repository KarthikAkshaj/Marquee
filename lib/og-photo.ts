import sharp from "sharp";

/**
 * A profile photo for a link preview (SPEC §19), fetched on the server and
 * handed to Satori as a data URL. Why it isn't just passed along:
 *
 * - `avatar_url` is the owner's to edit, so the server must only ever fetch
 *   from the hosts the app itself puts photos on, never an address someone
 *   typed in.
 * - Satori draws PNG, JPEG and GIF only, and uploaded photos are WebP, so
 *   the photo is redrawn as a small PNG with sharp (Next's own converter).
 *   Anything that still can't be read gets initials instead of failing the
 *   whole image.
 */
const TIMEOUT_MS = 3000;
const MAX_BYTES = 5 * 1024 * 1024;
/** Drawn at 200px in the preview; a little over for sharpness. */
const SIZE = 256;

export function photoHosts(supabaseUrl: string): string[] {
  return [`${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/avatars/`, "https://lh3.googleusercontent.com/"];
}

export function isTrustedPhoto(url: string, hosts: string[]): boolean {
  return hosts.some((prefix) => url.startsWith(prefix)) && !url.includes("..");
}

/** The image type from its first bytes, if it's one Satori can draw as it is. */
export function drawableType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/gif" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  return null;
}

const dataUrl = (type: string, bytes: Uint8Array) => `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;

export async function drawablePhoto(url: string | null, hosts: string[]): Promise<string | null> {
  if (!url || !isTrustedPhoto(url, hosts)) return null;
  let bytes: Uint8Array;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
    if (!response.ok || Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
    bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return null;
  } catch {
    return null;
  }

  try {
    const png = await sharp(bytes).resize(SIZE, SIZE, { fit: "cover" }).png().toBuffer();
    return dataUrl("image/png", png);
  } catch {
    // sharp couldn't read it; Satori still can if it's already a plain format.
    const type = drawableType(bytes);
    return type ? dataUrl(type, bytes) : null;
  }
}
