import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The browser-tab icon: just the amber bulb, on whatever colour the tab is. */
export default function Icon() {
  return new ImageResponse(iconArt({ size: 32, bulb: 0.78, transparent: true }), size);
}
