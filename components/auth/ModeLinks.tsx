import { Fragment } from "react";
import { LOGIN_MODES, type LoginMode } from "./loginModes";

/** Beside the password label: over to the reset form. */
export function ForgotLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-my-3 py-3 text-[11.5px] text-text-muted underline-offset-3 transition-colors hover:text-text hover:underline"
    >
      Forgot it?
    </button>
  );
}

/** The quiet links under the login button that switch to another way in. */
export function ModeLinks({ mode, onSwitch, disabled }: { mode: LoginMode; onSwitch: (to: LoginMode) => void; disabled?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-12 text-text-muted md:mt-2.5">
      {LOGIN_MODES[mode].links.map((link, index) => (
        <Fragment key={link.to}>
          {index > 0 && <span aria-hidden>·</span>}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSwitch(link.to)}
            className="min-h-11 px-1 underline-offset-3 transition-colors hover:text-text hover:underline disabled:pointer-events-none md:min-h-8"
          >
            {link.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
