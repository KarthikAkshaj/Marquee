import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckInbox } from "./CheckInbox";

// The code form calls a server action; the network isn't part of these tests.
vi.mock("@/lib/actions/auth", () => ({ verifyEmailCode: vi.fn() }));

function renderInbox(overrides: Partial<Parameters<typeof CheckInbox>[0]> = {}) {
  const props = {
    email: "you@example.com",
    next: "/home",
    sentAt: 1_000_000,
    formAction: vi.fn(),
    pending: false,
    onDifferentEmail: vi.fn(),
    ...overrides,
  };
  render(<CheckInbox {...props} />);
  return props;
}

describe("CheckInbox", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("is the only heading and says how long the code lasts", () => {
    renderInbox();
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Check your inbox." })).toBeInTheDocument();
    expect(screen.getByText(/expires in 15 minutes/)).toBeInTheDocument();
  });

  it("asks for the six-digit code, with the link as a fallback", () => {
    renderInbox();
    expect(screen.getByRole("group", { name: "6-digit code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
    expect(screen.getByText("Or just tap the link in the email.")).toBeInTheDocument();
  });

  it("labels the countdown as a wait to resend, not the code's expiry", () => {
    renderInbox();
    const resend = screen.getByRole("button", { name: "Resend in 1:00" });
    expect(resend).toBeDisabled();
    expect(resend).toHaveClass("font-mono");
  });

  it("counts down and unlocks resend after 60 seconds", () => {
    renderInbox();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("button", { name: "Resend in 0:59" })).toBeDisabled();

    for (let second = 0; second < 59; second++) {
      act(() => vi.advanceTimersByTime(1000));
    }
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
  });

  it("keeps resend locked while a send is in flight", () => {
    renderInbox({ pending: true });
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });

  it("lets you go back to change the email", () => {
    const props = renderInbox();
    fireEvent.click(screen.getByRole("button", { name: "Different email" }));
    expect(props.onDifferentEmail).toHaveBeenCalledOnce();
  });
});
