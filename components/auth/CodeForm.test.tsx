import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const verifyEmailCode = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  verifyEmailCode: (state: unknown, formData: FormData) => verifyEmailCode(state, formData),
}));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const { CodeForm } = await import("./CodeForm");

function enterCode(code: string) {
  const first = screen.getAllByRole("textbox")[0];
  fireEvent.paste(first, { clipboardData: { getData: () => code } });
}

describe("CodeForm", () => {
  afterEach(() => {
    cleanup();
    verifyEmailCode.mockReset();
    replace.mockReset();
  });

  it("stamps the ticket on a right code and heads for the shelves", async () => {
    verifyEmailCode.mockResolvedValue({ status: "verified", next: "/c/anime" });
    render(<CodeForm email="you@example.com" next="/c/anime" sentAt={1} />);
    enterCode("123456");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/c/anime"));
    expect(screen.getByRole("status").textContent).toMatch(/You're in/);
    expect(screen.getByRole("button", { name: /You're in/ })).toHaveProperty("disabled", true);
  });

  it("stays put and says why on a wrong code", async () => {
    verifyEmailCode.mockResolvedValue({ status: "error", message: "That code doesn't match. Try again.", attempt: 1 });
    render(<CodeForm email="you@example.com" next="/home" sentAt={1} />);
    enterCode("000000");
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "That code doesn't match. Try again.");
    expect(replace).not.toHaveBeenCalled();
  });
});
