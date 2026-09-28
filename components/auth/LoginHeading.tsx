import { BrandMark } from "@/components/shell/BrandMark";
import { LOGIN_MODES, type LoginMode } from "./loginModes";

/** The card's brand, headline and one line of help, plus any error the URL brought back. */
export function LoginHeading({ mode, urlError }: { mode: LoginMode; urlError: string | null }) {
  const copy = LOGIN_MODES[mode];
  return (
    <>
      <BrandMark variant="card" />
      <h1 className="font-display opsz-120 mt-4.5 text-[32px] leading-[1.05] md:mt-5.5 md:text-[38px]">
        {/* A new word sputters on again (U24). */}
        {copy.lead} <em key={copy.lit} className="neon text-accent">{copy.lit}</em>
      </h1>
      <p className="mt-2.25 text-13 leading-normal text-text-muted md:mt-2.5 md:text-[13.5px]">
        {copy.sub}
        {copy.subWide && <span className="hidden md:inline"> {copy.subWide}</span>}
      </p>

      {urlError && (
        <p
          role="alert"
          className="mt-5 rounded-card border border-dropped/30 bg-dropped/10 px-3.5 py-2.5 text-13 text-dropped"
        >
          {urlError}
        </p>
      )}
    </>
  );
}
