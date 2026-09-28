import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const setPassword = vi.fn();
vi.mock("@/lib/actions/account", () => ({
  setPassword: (password: string, nonce?: string) => setPassword(password, nonce),
}));

const { PasswordCard } = await import("./PasswordCard");

function choose(password: string) {
  fireEvent.click(screen.getByRole("button", { name: "Set a password" }));
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
}

describe("PasswordCard", () => {
  afterEach(() => {
    cleanup();
    setPassword.mockReset();
  });

  it("saves a new password and says so", async () => {
    setPassword.mockResolvedValue({ ok: true });
    render(<PasswordCard email="you@example.com" hasPassword={false} notSaved={false} />);
    choose("popcorn-row-7");
    expect(await screen.findByRole("status")).toHaveTextContent("Saved. Use it next time you sign in.");
    expect(setPassword).toHaveBeenCalledWith("popcorn-row-7", undefined);
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
  });

  it("asks for the emailed code when Supabase wants proof, and sends it with the password", async () => {
    setPassword.mockResolvedValueOnce({ ok: false, confirm: true }).mockResolvedValueOnce({ ok: true });
    render(<PasswordCard email="you@example.com" hasPassword={false} notSaved={false} />);
    choose("popcorn-row-7");

    expect(await screen.findByText(/type the code we just sent to/)).toHaveTextContent("you@example.com");
    const first = screen.getAllByRole("textbox")[0];
    await waitFor(() => expect(first).not.toHaveAttribute("readonly"));
    fireEvent.paste(first, { clipboardData: { getData: () => "042917" } });
    await waitFor(() => expect(setPassword).toHaveBeenLastCalledWith("popcorn-row-7", "042917"));
    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
  });

  it("keeps Save asleep until the password is long enough", () => {
    render(<PasswordCard email="you@example.com" hasPassword={false} notSaved={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Set a password" }));
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "seven77" } });
    expect(screen.getByRole("button", { name: "Save password" })).toBeDisabled();
  });

  it("opens itself, calmly, when a sign-up's password didn't save", () => {
    render(<PasswordCard email="you@example.com" hasPassword={false} notSaved />);
    expect(screen.getByLabelText("New password")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("status")).toHaveTextContent("the password didn't save");
  });
});
