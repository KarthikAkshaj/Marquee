import { CAPTCHA_LINKS } from "@/lib/captcha";

/** hCaptcha asks that any page running it says so, since it reads the visitor's IP and browser. */
export function CaptchaNotice() {
  const link = "underline underline-offset-2 transition-colors hover:text-text";
  return (
    <p className="mt-4 text-center text-[11px] leading-relaxed text-text-muted">
      Protected by hCaptcha.{" "}
      <a href={CAPTCHA_LINKS.privacy} target="_blank" rel="noreferrer noopener" className={link}>
        Privacy
      </a>{" "}
      and{" "}
      <a href={CAPTCHA_LINKS.terms} target="_blank" rel="noreferrer noopener" className={link}>
        Terms
      </a>{" "}
      apply.
    </p>
  );
}
