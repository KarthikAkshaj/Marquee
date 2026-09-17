import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/items";
import { ProgressStepper } from "./ProgressStepper";

type Progress = Pick<Item, "status" | "progress_current" | "progress_total">;

function setup(progress: Partial<Progress> = {}) {
  const item: Progress = { status: "in_progress", progress_current: 7, progress_total: 24, ...progress };
  const onIncrement = vi.fn();
  const onChange = vi.fn();
  render(<ProgressStepper item={item} unit="Episodes" onIncrement={onIncrement} onChange={onChange} />);
  return { onIncrement, onChange };
}

/** Click a number, type, and finish with a key. */
function type(name: RegExp, text: string, key = "Enter") {
  fireEvent.click(screen.getByRole("button", { name }));
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key });
}

describe("ProgressStepper", () => {
  afterEach(cleanup);

  it("shows where you are, padded like the design", () => {
    setup();
    expect(screen.getByRole("button", { name: /^Episode you're on: 7/ })).toHaveTextContent("07");
    expect(screen.getByRole("button", { name: /^Total episodes.*: 24/ })).toHaveTextContent("24");
  });

  it("steps back with − and forward with +", () => {
    const { onIncrement, onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "One episode back" }));
    expect(onChange).toHaveBeenCalledWith(6, 24);
    fireEvent.click(screen.getByRole("button", { name: "One more episode" }));
    expect(onIncrement).toHaveBeenCalledOnce();
  });

  it("takes a typed episode, so 800 in isn't 800 taps", () => {
    const { onChange } = setup({ progress_current: 0, progress_total: 1100 });
    type(/^Episode you're on/, "800");
    expect(onChange).toHaveBeenCalledWith(800, 1100);
  });

  it("clears the total for something still airing", () => {
    const { onChange } = setup({ progress_current: 12, progress_total: 12, status: "completed" });
    type(/^Total episodes/, "");
    expect(onChange).toHaveBeenCalledWith(12, null);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains a count past the total, or a total under the count, without saving", () => {
    const { onChange } = setup();
    type(/^Episode you're on/, "30");
    expect(screen.getByRole("alert")).toHaveTextContent("That's past 24. Raise the total first.");
    type(/^Total episodes/, "5");
    expect(screen.getByRole("alert")).toHaveTextContent("You're on 7, so the total can't be lower.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("puts the number back on Esc", () => {
    const { onChange } = setup();
    type(/^Episode you're on/, "20", "Escape");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^Episode you're on: 7/ })).toBeInTheDocument();
  });

  it("can't go below zero or past the end", () => {
    setup({ progress_current: 0, progress_total: 12, status: "planned" });
    expect(screen.getByRole("button", { name: "One episode back" })).toBeDisabled();
    cleanup();
    setup({ progress_current: 12, progress_total: 12, status: "completed" });
    expect(screen.getByRole("button", { name: "One more episode" })).toBeDisabled();
  });
});
