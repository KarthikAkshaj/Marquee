/** Email sign-in codes (SPEC §6: Email OTP length 6, expiration 900s). */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 15 * 60 * 1000;

type OtpError = { code?: string; status?: number };

/**
 * Supabase answers a wrong code and an expired code with the same
 * `otp_expired` error, so the message is picked by how long ago the code was
 * sent (SPEC §8.2). `sentAt` and `now` must come from the same clock.
 */
export function otpErrorMessage(error: OtpError, sentAt: number | null, now: number) {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many tries. Give it a minute, then try again.";
  }

  if (error.code === "otp_expired") {
    const expired = sentAt !== null && now - sentAt >= OTP_TTL_MS;
    return expired ? "That one expired. Send a new one." : "That code doesn't match. Try again.";
  }

  return "Couldn't check that code. Try again.";
}
