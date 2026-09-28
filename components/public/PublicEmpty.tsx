import Link from "next/link";
import { Button } from "@/components/ui/Button";

type PublicEmptyProps = {
  line: string;
  sentence: string;
  /** Only the owner gets somewhere to go. */
  action?: { href: string; label: string };
};

/** One serif line, one muted sentence, and an action when there's something to do about it. */
export function PublicEmpty({ line, sentence, action }: PublicEmptyProps) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center md:py-20">
      <p className="font-display text-[28px] leading-[1.1] md:text-[32px]">{line}</p>
      <p className="mt-2.5 max-w-90 text-13 leading-[1.55] text-text-muted md:text-14">{sentence}</p>
      {action && (
        <Button asChild variant="secondary" className="mt-5.5 h-11 px-4.5 text-13 md:h-10">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
