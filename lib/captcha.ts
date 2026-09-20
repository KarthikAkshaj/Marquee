/**
 * hCaptcha, which Supabase checks on its side before it will send a sign-in
 * code (SPEC §6). Invisible: it runs when the form is submitted and only shows
 * a challenge when it doesn't like the look of the request.
 *
 * With no site key set (local work, the tests) there is no widget and no
 * token, which matches a Supabase project that has captcha switched off.
 */
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim() ?? "";

export const captchaEnabled = () => CAPTCHA_SITE_KEY.length > 0;

/** hCaptcha's hosts, for the content security policy. */
export const CAPTCHA_HOSTS = ["https://js.hcaptcha.com", "https://*.hcaptcha.com"];

export const CAPTCHA_LINKS = {
  privacy: "https://www.hcaptcha.com/privacy",
  terms: "https://www.hcaptcha.com/terms",
};
