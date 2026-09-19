import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/brand";

/** The web app manifest's icons, drawn once at build time (SPEC §11 PWA). */
const FILES: Record<string, { size: number; mark: number; radius: number }> = {
  "icon-192.png": { size: 192, mark: 0.46, radius: 0.23 },
  "icon-512.png": { size: 512, mark: 0.46, radius: 0.23 },
  // Launchers crop maskable icons to a circle or squircle: square corners, and the M stays well inside.
  "icon-maskable-512.png": { size: 512, mark: 0.4, radius: 0 },
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[file]">) {
  const { file } = await params;
  const art = FILES[file];
  return new ImageResponse(iconArt(art), { width: art.size, height: art.size });
}
