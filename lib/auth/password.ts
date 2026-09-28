/**
 * Email + password sign-in (SPEC §6). A password is always set after an
 * emailed code proves the address, so sign-up and "forgot it" are one flow.
 */
export const PASSWORD_MIN = 8;
/** bcrypt reads 72 bytes and Supabase refuses anything longer. */
export const PASSWORD_MAX_BYTES = 72;

/** Remembers how the last sign-in on this browser went, so the page opens that way. */
export const SIGN_IN_METHOD_COOKIE = "marquee-sign-in";
export const SIGN_IN_METHOD_MAX_AGE = 60 * 60 * 24 * 365;

/** Where a sign-up lands when the code worked but the password didn't save. */
export const PASSWORD_NOT_SAVED = "/settings/account?notice=password-not-saved";

export const passwordBytes = (password: string) => new TextEncoder().encode(password).length;

/**
 * Supabase can't say whether a password exists (code sign-ups get a random
 * one), so every save through the app marks it in the user's metadata.
 */
export const PASSWORD_FLAG = "password_set";
export const hasPassword = (metadata: Record<string, unknown> | undefined) => metadata?.[PASSWORD_FLAG] === true;

export type PasswordStrength = { score: 0 | 1 | 2 | 3; label: string };

// Enough to catch the passwords people reach for first; not a breach list.
const OBVIOUS = /^(?:password|passw0rd|qwerty|letmein|welcome|iloveyou|admin|marquee|abc|123)/i;

/** A rough read on a new password: length counts most, variety a little. */
export function passwordStrength(password: string): PasswordStrength {
  const length = [...password].length;
  if (length < PASSWORD_MIN) {
    return { score: 0, label: length === 0 ? `${PASSWORD_MIN} or more characters` : `${PASSWORD_MIN - length} more to go` };
  }

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((kind) => kind.test(password)).length;
  const repetitive = new Set(password.toLowerCase()).size <= 3;
  const sequence = "0123456789abcdefghijklmnopqrstuvwxyz".includes(password.toLowerCase());

  if (repetitive || sequence || OBVIOUS.test(password) || (length < 10 && kinds < 3)) {
    return { score: 1, label: "Weak. Longer beats clever." };
  }
  if (length >= 14 || (length >= 12 && kinds >= 3)) return { score: 3, label: "Strong" };
  return { score: 2, label: "Good" };
}

type AuthError = { code?: string; status?: number; message?: string };

const TOO_MANY = "Too many tries. Give it a minute, then try again.";

/** Wrong email and wrong password get one answer, so nobody learns who has an account. */
export function signInErrorMessage(error: AuthError) {
  if (error.status === 429 || error.code === "over_request_rate_limit") return TOO_MANY;
  if (error.code === "captcha_failed" || /captcha/i.test(error.message ?? "")) {
    return "The robot check didn't pass. Refresh the page and try again.";
  }
  if (error.code === "invalid_credentials") {
    return "That email and password don't match. No password yet? Use Forgot it to make one.";
  }
  if (error.code === "email_not_confirmed") return "That email isn't confirmed yet. Use Forgot it to get a code.";
  return "Couldn't sign you in. Try again.";
}

/** For Settings → Account, where the person is already signed in. */
export function savePasswordErrorMessage(error: AuthError) {
  if (error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
    return TOO_MANY;
  }
  if (error.code === "weak_password") return `Pick a stronger one: at least ${PASSWORD_MIN} characters.`;
  if (error.code === "reauthentication_not_valid") return "That code doesn't match. Try again.";
  return "Couldn't save your password. Try again.";
}
