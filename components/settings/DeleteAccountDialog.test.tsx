import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deleteAccount = vi.fn();
vi.mock("@/lib/actions/account", () => ({
  deleteAccount: (...args: unknown[]) => deleteAccount(...args),
  exportData: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { DeleteAccountDialog } = await import("./DeleteAccountDialog");

function setup() {
  render(<DeleteAccountDialog open onOpenChange={vi.fn()} username="void_flux" titleCount={2} categoryCount={4} />);
  return {
    input: screen.getByLabelText(/to confirm/i),
    button: screen.getByRole("button", { name: "Delete forever" }),
  };
}

describe("DeleteAccountDialog", () => {
  beforeEach(() => {
    deleteAccount.mockReset();
  });
  afterEach(cleanup);

  it("says what goes, without mentioning shared lists", () => {
    setup();
    const dialog = screen.getByRole("alertdialog", { name: "Delete your account?" });
    expect(dialog).toHaveTextContent("2 titles across 4 categories");
    expect(dialog).toHaveTextContent("Your profile and photo");
    expect(dialog).not.toHaveTextContent(/shared/i);
    expect(screen.getByRole("button", { name: "Export my data first →" })).toBeInTheDocument();
  });

  it("starts empty, with no hint of the username, and stays locked until it's typed exactly", () => {
    const { input, button } = setup();
    expect(input).toHaveValue("");
    expect(input).not.toHaveAttribute("placeholder");
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "Void_flux" } });
    expect(button).toBeDisabled();
    fireEvent.change(input, { target: { value: "void_flux" } });
    expect(button).toBeEnabled();
  });

  it("deletes with the typed confirmation and shows why if it can't", async () => {
    deleteAccount.mockResolvedValue({ ok: false, message: "Couldn't delete your account. Try again." });
    const { input, button } = setup();
    fireEvent.change(input, { target: { value: "void_flux" } });
    fireEvent.click(button);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith("void_flux"));
    expect(await screen.findByText("Couldn't delete your account. Try again.")).toBeInTheDocument();
  });
});
