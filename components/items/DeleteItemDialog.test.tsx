import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteItemDialog } from "./DeleteItemDialog";

function setup(title: string | null) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(<DeleteItemDialog title={title} onCancel={onCancel} onConfirm={onConfirm} />);
  return { onCancel, onConfirm };
}

describe("DeleteItemDialog", () => {
  afterEach(cleanup);

  it("stays closed without a title", () => {
    setup(null);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks about the title by name and only removes on confirm", () => {
    const { onCancel, onConfirm } = setup("Frieren");
    expect(screen.getByRole("alertdialog", { name: "Remove Frieren from your marquee?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms with Remove", () => {
    const { onConfirm } = setup("Frieren");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
