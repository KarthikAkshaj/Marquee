import { TicketStamp } from "@/components/fun/TicketStamp";

/** The ticket stamped on a right code or password, holding while the shelves load (U18). */
export function SignedInStamp() {
  return (
    <>
      <TicketStamp hold caption="ENJOY THE SHOW" onDone={() => {}} />
      <p role="status" className="sr-only">
        You&apos;re in. Opening your shelves.
      </p>
    </>
  );
}
