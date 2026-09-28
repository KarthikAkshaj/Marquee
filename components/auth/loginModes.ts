/**
 * The four ways through the login card (SPEC §6, §8.2). `create` and `reset`
 * are one flow in different words: choose a password, type the emailed code,
 * and the password is saved as you come in.
 */
export type LoginMode = "code" | "password" | "create" | "reset";

type ModeCopy = {
  /** The heading; `lit` is its last word, in neon. */
  lead: string;
  lit: string;
  sub: string;
  /** Added after `sub` where there's room. */
  subWide?: string;
  passwordLabel?: string;
  submit: string;
  busy: string;
  /** Other forms this one points to, under the button. */
  links: { to: LoginMode; label: string }[];
};

export const LOGIN_MODES: Record<LoginMode, ModeCopy> = {
  code: {
    lead: "Let's get you",
    lit: "in.",
    sub: "New here? This is also how you sign up.",
    subWide: "Free, no card.",
    submit: "Email me a code",
    busy: "Sending…",
    links: [{ to: "password", label: "Use a password instead" }],
  },
  password: {
    lead: "Let's get you",
    lit: "in.",
    sub: "Welcome back. Your seat's where you left it.",
    passwordLabel: "Password",
    submit: "Sign in",
    busy: "Signing in…",
    links: [
      { to: "create", label: "New here? Create an account" },
      { to: "code", label: "Email me a code instead" },
    ],
  },
  create: {
    lead: "Grab a",
    lit: "seat.",
    sub: "Pick a password, then type the code we email you.",
    passwordLabel: "Password",
    submit: "Create account",
    busy: "Sending…",
    links: [{ to: "password", label: "Have a password? Sign in" }],
  },
  reset: {
    lead: "No",
    lit: "worries.",
    sub: "Pick a new password, then type the code we email you.",
    passwordLabel: "New password",
    submit: "Email me a code",
    busy: "Sending…",
    links: [{ to: "password", label: "Back to sign in" }],
  },
};

/** A new password is chosen here and saved once the emailed code checks out. */
export const choosesPassword = (mode: LoginMode) => mode === "create" || mode === "reset";
