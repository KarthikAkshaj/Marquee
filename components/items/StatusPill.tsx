import { STATUS_STYLE, statusLabel, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Dot + label on a 12% tint (SPEC §9.5). The label means colour is never the only signal. */
export function StatusPill({
  kind,
  status,
  className,
}: {
  kind: CategoryKind;
  status: ItemStatus;
  className?: string;
}) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-12 font-medium whitespace-nowrap",
        style.tint,
        style.text,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", style.fill)} />
      {statusLabel(kind, status)}
    </span>
  );
}
