import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryDialog } from "./CategoryDialog";

describe("CategoryDialog", () => {
  afterEach(cleanup);

  it("creates with the picked type, colour and icon", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, slug: "k-dramas" });
    const onClose = vi.fn();
    render(<CategoryDialog open onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  K-Dramas " } });
    fireEvent.click(screen.getByRole("radio", { name: "Series" }));
    fireEvent.click(screen.getByRole("radio", { name: "Rose" }));
    fireEvent.click(screen.getByRole("radio", { name: "heart" }));
    expect(screen.getByText("Plan to Watch · Watching · Completed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({ name: "K-Dramas", kind: "series", color: "rose", icon: "heart" });
  });

  it("asks for a name before saving, and shows the server's reason on failure", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: "Couldn't create that category. Try again." });
    render(<CategoryDialog open onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Give it a name.");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Books" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Couldn't create that category. Try again.")).toBeInTheDocument();
  });

  it("edits only the four fields, whatever else the category carries", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    const category = { id: "x", slug: "games", position: 3, itemCount: 57, name: "Games", kind: "game", color: "teal", icon: "gamepad-2" } as const;
    render(<CategoryDialog open initial={category} onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(screen.getByRole("radio", { name: "Game" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Games", kind: "game", color: "teal", icon: "gamepad-2" }));
  });
});
