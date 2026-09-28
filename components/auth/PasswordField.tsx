import type { ReactNode } from "react";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrength } from "./PasswordStrength";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** A password being chosen: the strength bulbs show, and managers offer to generate one. */
  isNew: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Sits at the right of the label row ("Forgot it?"). */
  aside?: ReactNode;
  readOnly?: boolean;
};

/** The login card's password field, rising in under the email when it's needed. */
export function PasswordField({ label, value, onChange, isNew, invalid, describedBy, aside, readOnly }: PasswordFieldProps) {
  return (
    <div className="mt-3.5 animate-rise lite:animate-none">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="password" className="label-mono tracking-[.12em] text-text-muted">
          {label}
        </label>
        {aside}
      </div>
      <PasswordInput
        id="password"
        name="password"
        autoComplete={isNew ? "new-password" : "current-password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={[isNew && "password-strength", describedBy].filter(Boolean).join(" ") || undefined}
        readOnly={readOnly}
        required
      />
      {isNew && <PasswordStrength password={value} id="password-strength" />}
    </div>
  );
}
