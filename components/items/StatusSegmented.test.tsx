import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusSegmented } from "./StatusSegmented";

describe("StatusSegmented", () => {
  afterEach(cleanup);

  function setup() {
    const onChange = vi.fn();
    render(
      <>
        <p id="label">Status</p>
        <StatusSegmented kind="game" value="in_progress" onChange={onChange} labelledBy="label" />
      </>,
    );
    return { onChange };
  }

  it("is one labelled radio group in the shelf's own words, with one tab stop", () => {
    setup();
    expect(screen.getByRole("radiogroup", { name: "Status" })).toBeInTheDocument();
    const playing = screen.getByRole("radio", { name: "Playing" });
    expect(playing).toHaveAttribute("aria-checked", "true");
    expect(playing).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Backlog" })).toHaveAttribute("tabindex", "-1");
  });

  it("changes on click and with the arrow keys, wrapping around", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("radio", { name: "Abandoned" }));
    expect(onChange).toHaveBeenLastCalledWith("dropped");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Playing" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("completed");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Playing" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("planned");
  });
});
