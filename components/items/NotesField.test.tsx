import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotesField } from "./NotesField";

describe("NotesField", () => {
  afterEach(cleanup);

  it("saves when you click away, only if something changed", () => {
    const onSave = vi.fn();
    render(<NotesField value="Ep 7 hits." onSave={onSave} />);
    const notes = screen.getByLabelText("Notes");

    fireEvent.blur(notes);
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(notes, { target: { value: "Ep 7 hits. Headphones on." } });
    fireEvent.blur(notes);
    expect(onSave).toHaveBeenCalledWith("Ep 7 hits. Headphones on.");
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("stores cleared notes as none", () => {
    const onSave = vi.fn();
    render(<NotesField value="Something" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "  " } });
    fireEvent.blur(screen.getByLabelText("Notes"));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("still saves if the sheet closes before a blur", () => {
    const onSave = vi.fn();
    const { unmount } = render(<NotesField value={null} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Left off at 812." } });
    unmount();
    expect(onSave).toHaveBeenCalledWith("Left off at 812.");
  });
});
