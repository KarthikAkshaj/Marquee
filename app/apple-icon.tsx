import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The iPhone home-screen icon. iOS rounds the corners itself. */
export default function AppleIcon() {
  return new ImageResponse(iconArt({ size: 180, mark: 0.46, radius: 0 }), size);
}
