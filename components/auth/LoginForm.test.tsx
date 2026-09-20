import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithEmail = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  signInWithEmail: (state: unknown, formData: FormData) => signInWithEmail(state, formData),
}));

const execute = vi.fn();
const render_ = vi.fn<(container: HTMLElement, options: Record<string, unknown>) => string>(() => "widget-1");
const reset = vi.fn();

// Both have to be in place before the component is imported: the site key is read
// once at module load, and the hook looks for the script's `window.hcaptcha`.
process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = "site-key-123";
Object.defineProperty(window, "hcaptcha", { writable: true, value: { render: render_, execute, reset } });

const { LoginForm } = await import("./LoginForm");

function setup() {
  render(<LoginForm next="/home" urlError={null} googleEnabled={false} />);
}

async function submitEmail() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "someone@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Email me a code" }));
}

describe("LoginForm with captcha", () => {
  afterEach(() => {
    cleanup();
    signInWithEmail.mockReset();
    execute.mockReset();
  });

  it("sends the captcha token along with the email", async () => {
    execute.mockResolvedValue({ response: "token-abc" });
    signInWithEmail.mockResolvedValue({ status: "sent", email: "someone@example.com", sentAt: 1 });
    setup();
    await waitFor(() => expect(render_).toHaveBeenCalled());
    expect(render_.mock.calls[0][1]).toMatchObject({ sitekey: "site-key-123", size: "invisible" });

    await submitEmail();
    await waitFor(() => expect(signInWithEmail).toHaveBeenCalled());
    const sent = signInWithEmail.mock.calls[0][1] as FormData;
    expect(sent.get("email")).toBe("someone@example.com");
    expect(sent.get("captchaToken")).toBe("token-abc");
  });

  it("says so, and sends nothing, when the robot check won't run", async () => {
    execute.mockRejectedValue(new Error("challenge closed"));
    setup();
    await waitFor(() => expect(render_).toHaveBeenCalled());

    await submitEmail();
    expect(await screen.findByRole("alert")).toHaveTextContent("The robot check didn't load.");
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it("tells people hCaptcha is running, as hCaptcha asks", async () => {
    setup();
    const notice = screen.getByText(/Protected by hCaptcha/);
    expect(notice).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "https://www.hcaptcha.com/privacy");
  });
});
