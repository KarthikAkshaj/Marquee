import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

// Opened from a plain button, not a Radix trigger, like every dialog in the app.
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete Frieren
      </button>
      <ConfirmDialog
        open={open}
        title="Remove Frieren?"
        description="It goes for good."
        cancelLabel="Keep it"
        confirmLabel="Remove"
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  afterEach(cleanup);

  it("hands focus back to what opened it", async () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Delete Frieren" });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole("alertdialog", { name: "Remove Frieren?" });
    expect(opener).not.toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
