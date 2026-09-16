"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { verifyEmailCode, type VerifyCodeState } from "@/lib/actions/auth";
import { OTP_LENGTH } from "@/lib/auth/otp";
import { CodeInput } from "./CodeInput";

const initialState: VerifyCodeState = { status: "idle" };

type CodeFormProps = {
  email: string;
  next: string;
  /** Server time the code was sent; decides "expired" vs "doesn't match". */
  sentAt: number;
};

/** Code entry: submits by itself once six digits are in, Verify is the backup. */
export function CodeForm({ email, next, sentAt }: CodeFormProps) {
  const [state, formAction, pending] = useActionState(verifyEmailCode, initialState);
  const [complete, setComplete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const failed = state.status === "error";

  return (
    <form ref={formRef} action={formAction} className="mt-6" noValidate>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="sentAt" value={sentAt} />

      <CodeInput
        // A new key per failed attempt clears the boxes and replays the shake.
        key={failed ? state.attempt : 0}
        invalid={failed}
        readOnly={pending}
        describedBy={failed ? "code-error code-hint" : "code-hint"}
        onChange={(code) => setComplete(code.length === OTP_LENGTH)}
        onComplete={() => {
          if (!pending) formRef.current?.requestSubmit();
        }}
      />

      {failed && (
        <p id="code-error" role="alert" className="mt-2.5 text-13 text-dropped">
          {state.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={!complete || pending}
        aria-busy={pending}
        className="mt-3 h-auto min-h-11 w-full py-3 text-14 shadow-cta-sm"
      >
        {pending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {pending ? "Checking…" : "Verify"}
      </Button>

      <p id="code-hint" className="mt-2.5 text-12 text-text-muted">
        Or just tap the link in the email.
      </p>
    </form>
  );
}
