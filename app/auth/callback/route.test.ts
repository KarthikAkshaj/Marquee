// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { GET } = await import("./route");
const { createClient } = await import("@/lib/supabase/server");

function signedIn() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { exchangeCodeForSession: async () => ({ error: null }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

const call = (query: string) => GET(new NextRequest(`http://localhost:3000/auth/callback?${query}`));

describe("auth callback", () => {
  it("sends the first email-change confirmation back to Account with a notice", async () => {
    const response = await call(
      "next=%2Fsettings%2Faccount&message=Confirmation+link+accepted.+Please+proceed+to+confirm+link+sent+to+the+other+email",
    );
    expect(response.headers.get("location")).toBe("http://localhost:3000/settings/account?notice=email-half-confirmed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("treats a link with neither a code nor a message as broken", async () => {
    expect((await call("next=%2Fhome")).headers.get("location")).toBe("http://localhost:3000/auth/auth-code-error");
    expect((await call("message=x&error=access_denied")).headers.get("location")).toBe(
      "http://localhost:3000/auth/auth-code-error",
    );
  });

  it("leaves a welcome for sign-ins, and only for sign-ins", async () => {
    signedIn();
    const welcomed = await call("code=abc&next=%2Fhome&welcome=1");
    expect(welcomed.headers.get("location")).toBe("http://localhost:3000/home");
    expect(welcomed.cookies.get("marquee-welcome")?.value).toBe("1");

    signedIn();
    const emailChange = await call("code=abc&next=%2Fsettings%2Faccount");
    expect(emailChange.cookies.get("marquee-welcome")).toBeUndefined();
  });

  it("never follows a next that leaves the site", async () => {
    const response = await call("next=https%3A%2F%2Fevil.example&message=ok");
    expect(response.headers.get("location")).toBe("http://localhost:3000/home?notice=email-half-confirmed");
  });
});
