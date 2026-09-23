/**
 * The year's ticket as a PNG, to keep or post. /wrapped itself is behind a
 * session and shows whoever is looking at their own year, so a link to it is
 * no use to anyone else: an image is what actually travels.
 *
 * Geist Mono is committed beside this file (SIL Open Font License, see
 * GeistMono-OFL.txt) because Satori cannot read the .woff2 that next/font
 * serves the browser, and hands the bytes over itself.
 */
import { ImageResponse } from "next/og";
import { getWrappedItems } from "@/lib/queries";
import { TICKET_SIZE, ticketArt } from "@/lib/ticket";
import { summarise, wrappedYear } from "@/lib/wrapped";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * Read once per instance, on the first request rather than at import: Node's
 * fetch refuses a file: URL, which is what the documented `fetch(new URL(...))`
 * pattern becomes outside the edge runtime.
 */
let geistMono: Promise<Buffer> | null = null;
function font() {
  geistMono ??= readFile(fileURLToPath(new URL("./GeistMono.ttf", import.meta.url)));
  return geistMono;
}

export async function GET() {
  const year = wrappedYear();
  const wrapped = summarise(await getWrappedItems(year), year);

  return new ImageResponse(ticketArt({ wrapped }), {
    ...TICKET_SIZE,
    fonts: [{ name: "Geist Mono", data: await font(), style: "normal", weight: 400 }],
    headers: {
      // Someone's year is their own: never cached by anything in between.
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="marquee-${year}.png"`,
    },
  });
}
