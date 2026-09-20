/**
 * Cloudflare Turnstile, which Supabase checks on its side before it will send a
 * sign-in code (SPEC §6). It runs when the form is submitted, and shows the
 * visitor something only when it wants them to prove they are a person.
 *
 * With no site key set (local work, the tests) there is no widget and no
 * token, which matches a Supabase project that has captcha switched off.
 */
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

export const captchaEnabled = () => CAPTCHA_SITE_KEY.length > 0;

/**
 * Turnstile's one host, for the content security policy: the script, and the
 * frame it puts the challenge in. Everything else it needs it loads itself,
 * from the same place.
 */
export const CAPTCHA_HOSTS = ["https://challenges.cloudflare.com"];

export const CAPTCHA_LINKS = {
  privacy: "https://www.cloudflare.com/privacypolicy/",
  terms: "https://www.cloudflare.com/website-terms/",
};
