import { KeyRound, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { GoogleMark } from "@/components/auth/GoogleMark";
import type { Account } from "@/lib/queries";

type Way = { key: string; label: string; icon: ReactNode };

/**
 * How this account can get in, one chip per way: Google, a code by email, a
 * password. Chips wrap as a row, so a narrow phone never folds a sentence
 * inside a pill.
 */
export function SignInWays({ google, email, password }: Account["signsInWith"]) {
  const ways: Way[] = [];
  if (google) ways.push({ key: "google", label: "Google", icon: <GoogleMark className="size-3.25" /> });
  if (email || ways.length === 0) {
    ways.push({ key: "code", label: "Email code", icon: <Mail aria-hidden className="size-3.5 text-text-muted" strokeWidth={1.8} /> });
  }
  if (password) ways.push({ key: "password", label: "Password", icon: <KeyRound aria-hidden className="size-3.5 text-text-muted" strokeWidth={1.8} /> });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <span id="sign-in-ways" className="text-12 text-text-muted">
        Sign in with
      </span>
      <ul aria-labelledby="sign-in-ways" className="flex flex-wrap gap-1.5">
        {ways.map((way) => (
          <li
            key={way.key}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11.5px] whitespace-nowrap md:px-2.5"
          >
            {way.icon}
            {way.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
