/**
 * A profile photo for a link preview (SPEC §19), fetched on the server and
 * handed to Satori as a data URL. Two reasons it isn't just passed along:
 *
 * - `avatar_url` is the owner's to edit, so the server must only ever fetch
 *   from the hosts the app itself puts photos on, never an address someone
 *   typed in.
 * - Satori draws PNG, JPEG and GIF only. Uploaded photos are WebP, and a
 *   photo it can't read would fail the whole image, so those get initials.
 */
const TIMEOUT_MS = 3000;

export function photoHosts(supabaseUrl: string): string[] {
  return [`${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/avatars/`, "https://lh3.googleusercontent.com/"];
}

export function isTrustedPhoto(url: string, hosts: string[]): boolean {
  return hosts.some((prefix) => url.startsWith(prefix)) && !url.includes("..");
}

/** The image type from its first bytes, if it's one Satori can draw. */
export function drawableType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/gif" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  return null;
}

export async function drawablePhoto(url: string | null, hosts: string[]): Promise<string | null> {
  if (!url || !isTrustedPhoto(url, hosts)) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = drawableType(bytes);
    return type ? `data:${type};base64,${Buffer.from(bytes).toString("base64")}` : null;
  } catch {
    return null;
  }
}
