import { PublicEmpty } from "@/components/public/PublicEmpty";
import { PublicFrame } from "@/components/public/PublicFrame";
import { isSignedIn } from "@/lib/queries";

/** A link that was turned off, replaced, or never was: they all look alike. */
export default async function ShelfLinkNotFound() {
  const signedIn = await isSignedIn();
  return (
    <PublicFrame color={null} signedIn={signedIn}>
      <h1 className="sr-only">Nothing showing</h1>
      <PublicEmpty
        line="Nothing showing here."
        sentence="This link was turned off or replaced. Ask for a fresh one."
        action={{ href: "/", label: "Back to Marquee" }}
      />
    </PublicFrame>
  );
}
