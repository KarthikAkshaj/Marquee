import { PublicEmpty } from "@/components/public/PublicEmpty";
import { PublicFrame } from "@/components/public/PublicFrame";
import { isSignedIn } from "@/lib/queries";

/** A private profile and a missing one look alike, so nobody learns which usernames exist. */
export default async function PublicProfileNotFound() {
  const signedIn = await isSignedIn();
  return (
    <PublicFrame color={null} signedIn={signedIn}>
      <h1 className="sr-only">Nothing showing</h1>
      <PublicEmpty
        line="Nothing showing here."
        sentence="This profile is private, or there's no one by that name."
        action={{ href: "/", label: "Back to Marquee" }}
      />
    </PublicFrame>
  );
}
