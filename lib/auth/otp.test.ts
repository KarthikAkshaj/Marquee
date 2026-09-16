import { describe, expect, it } from "vitest";
import { OTP_TTL_MS, otpErrorMessage } from "./otp";

const SENT = 1_000_000;
const rejected = { code: "otp_expired", status: 403 };

describe("otpErrorMessage", () => {
  it("calls a rejected code a mismatch while it could still be valid", () => {
    expect(otpErrorMessage(rejected, SENT, SENT + 60_000)).toBe(
      "That code doesn't match. Try again.",
    );
    expect(otpErrorMessage(rejected, SENT, SENT + OTP_TTL_MS - 1)).toBe(
      "That code doesn't match. Try again.",
    );
  });

  it("calls it expired from the 15-minute mark on", () => {
    expect(otpErrorMessage(rejected, SENT, SENT + OTP_TTL_MS)).toBe(
      "That one expired. Send a new one.",
    );
  });

  it("falls back to mismatch when the send time is unknown", () => {
    expect(otpErrorMessage(rejected, null, SENT)).toBe("That code doesn't match. Try again.");
  });

  it("says so when rate limited", () => {
    expect(otpErrorMessage({ status: 429 }, SENT, SENT)).toMatch(/Too many tries/);
    expect(otpErrorMessage({ code: "over_request_rate_limit" }, SENT, SENT)).toMatch(/Too many tries/);
  });

  it("has a generic message for anything else", () => {
    expect(otpErrorMessage({ status: 500 }, SENT, SENT)).toBe("Couldn't check that code. Try again.");
  });
});
