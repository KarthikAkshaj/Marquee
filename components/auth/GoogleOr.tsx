import { GoogleButton } from "./GoogleButton";

/** Google first, then a quiet "or" before the email forms. */
export function GoogleOr({ next }: { next: string }) {
  return (
    <>
      <GoogleButton next={next} className="mt-6" />
      <div aria-hidden className="my-4.5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="label-mono text-text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
