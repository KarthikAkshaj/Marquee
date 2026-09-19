import Link from "next/link";
import { Button } from "@/components/ui/Button";

type MatchDoneProps = {
  shelfName: string;
  href: string;
  /** "Updated 12 titles and added 3 more"; null when there was nothing to do. */
  summary: string | null;
};

/** Find covers with every title matched: what happened, and the way back to the shelf. */
export function MatchDone({ shelfName, href, summary }: MatchDoneProps) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[12px] border border-border bg-surface px-5 py-7 surface-highlight md:px-8">
      <p role="status" className="font-mono text-[13px] text-completed">
        {summary ?? "Nothing to match"}
      </p>
      <p className="text-14 text-text-muted">Every title on {shelfName} has its cover and details{summary ? " now" : " already"}.</p>
      <Button asChild className="h-11 px-5">
        <Link href={href}>Back to {shelfName}</Link>
      </Button>
    </div>
  );
}
