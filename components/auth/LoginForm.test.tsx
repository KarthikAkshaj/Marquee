import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithEmail = vi.fn();
const signInWithPassword = vi.fn();
// The code entry form renders once a code is sent, and reaches for this.
const verifyEmailCode = vi.fn<(state: unknown, formData: FormData) => Promise<{ status: "idle" }>>(async () => ({ status: "idle" }));
vi.mock("@/lib/actions/auth", () => ({
  signInWithEmail: (state: unknown, formData: FormData) => signInWithEmail(state, formData),
  signInWithPassword: (state: unknown, formData: FormData) => signInWithPassword(state, formData),
  verifyEmailCode: (state: unknown, formData: FormData) => verifyEmailCode(state, formData),
}));
// A right code, or a right password, moves on with the router (U18).
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

type Options = Record<string, (token?: string) => void> & { sitekey?: string };
/** What the widget was rendered with, so a test can call Turnstile's callbacks back. */
let options: Options = {};
const execute = vi.fn();
const render_ = vi.fn<(container: HTMLElement, options: Options) => string>((_container, opts) => {
  options = opts;
  return "widget-1";
});
const reset = vi.fn();
const remove = vi.fn();

// Both have to be in place before the component is imported: the site key is read
// once at module load, and the hook looks for the script's `window.turnstile`.
process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key-123";
Object.defineProperty(window, "turnstile", { writable: true, value: { render: render_, execute, reset, remove } });

const { LoginForm } = await import("./LoginForm");

function setup(initialMode?: "code" | "password") {
  render(<LoginForm next="/home" urlError={null} googleEnabled={false} initialMode={initialMode} />);
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
    execute.mockImplementation(() => options.callback("token-abc"));
    signInWithEmail.mockResolvedValue({ status: "sent", email: "someone@example.com", sentAt: 1 });
    setup();
    await waitFor(() => expect(render_).toHaveBeenCalled());
    expect(render_.mock.calls[0][1]).toMatchObject({
      sitekey: "site-key-123",
      execution: "execute",
      appearance: "interaction-only",
    });

    await submitEmail();
    await waitFor(() => expect(signInWithEmail).toHaveBeenCalled());
    const sent = signInWithEmail.mock.calls[0][1] as FormData;
    expect(sent.get("email")).toBe("someone@example.com");
    expect(sent.get("captchaToken")).toBe("token-abc");
  });

  it("says so, and sends nothing, when the robot check won't run", async () => {
    execute.mockImplementation(() => options["error-callback"]());
    setup();
    await waitFor(() => expect(render_).toHaveBeenCalled());

    await submitEmail();
    expect(await screen.findByRole("alert")).toHaveTextContent("The robot check didn't load.");
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it("tells people Turnstile is running, as an honest page should", async () => {
    setup();
    const notice = screen.getByText(/Protected by Cloudflare Turnstile/);
    expect(notice).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "https://www.cloudflare.com/privacypolicy/");
  });
});

describe("LoginForm with a password", () => {
  afterEach(() => {
    cleanup();
    signInWithEmail.mockReset();
    signInWithPassword.mockReset();
    verifyEmailCode.mockClear();
    replace.mockReset();
    execute.mockReset();
  });

  it("opens on the password form for people who used one last time", () => {
    setup("password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
  });

  it("signs in with the password and the captcha token, then heads in", async () => {
    execute.mockImplementation(() => options.callback("token-pw"));
    signInWithPassword.mockResolvedValue({ status: "signed-in", next: "/home" });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Use a password instead" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "someone@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "popcorn-row-7" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
    const sent = signInWithPassword.mock.calls[0][1] as FormData;
    expect(sent.get("password")).toBe("popcorn-row-7");
    expect(sent.get("captchaToken")).toBe("token-pw");
    expect(signInWithEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("You're in.");
  });

  it("creates an account: the code goes out without the password, which rides along with the code", async () => {
    execute.mockImplementation(() => options.callback("token-new"));
    signInWithEmail.mockResolvedValue({ status: "sent", email: "someone@example.com", sentAt: 1 });
    setup("password");
    fireEvent.click(screen.getByRole("button", { name: "New here? Create an account" }));
    const create = screen.getByRole("button", { name: "Create account" });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "someone@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "seven77" } });
    expect(create).toBeDisabled();
    expect(screen.getByText("1 more to go")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "popcorn-row-7" } });
    fireEvent.click(create);

    await screen.findByText("Type it here and your password is set.");
    const sent = signInWithEmail.mock.calls[0][1] as FormData;
    expect(sent.get("password")).toBeNull();
    expect(sent.get("captchaToken")).toBe("token-new");

    fireEvent.paste(screen.getAllByRole("textbox")[0], { clipboardData: { getData: () => "042917" } });
    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalled());
    const verified = verifyEmailCode.mock.calls[0][1];
    expect(verified.get("password")).toBe("popcorn-row-7");
    expect(verified.getAll("code").join("")).toBe("042917");
  });

  it("puts the last form's error away when switching", async () => {
    execute.mockImplementation(() => options.callback("token-x"));
    signInWithPassword.mockResolvedValue({ status: "error", message: "That email and password don't match." });
    setup("password");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "someone@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("don't match");

    fireEvent.click(screen.getByRole("button", { name: "Forgot it?" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("someone@example.com");
  });
});
