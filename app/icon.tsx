import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The browser-tab icon: the M on the amber tile, a touch larger so it still reads at 16px. */
export default function Icon() {
  return new ImageResponse(iconArt({ size: 32, mark: 0.5, radius: 0.23 }), size);
}
