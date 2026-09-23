import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorScreen } from "./ErrorScreen";

describe("ErrorScreen", () => {
  it("offers a way out of a page that didn't load", () => {
    const retry = vi.fn();
    render(<ErrorScreen retry={retry} />);

    expect(screen.getByRole("heading")).toHaveTextContent("The projector jammed.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
