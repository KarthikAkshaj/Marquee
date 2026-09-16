import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeInput } from "./CodeInput";

function setup(props: Partial<Parameters<typeof CodeInput>[0]> = {}) {
  const onComplete = vi.fn();
  const onChange = vi.fn();
  render(<CodeInput onComplete={onComplete} onChange={onChange} {...props} />);
  const boxes = screen.getAllByRole("textbox") as HTMLInputElement[];
  return { boxes, onComplete, onChange };
}

const values = (boxes: HTMLInputElement[]) => boxes.map((box) => box.value).join("");

describe("CodeInput", () => {
  afterEach(cleanup);

  it("renders six labelled numeric boxes and focuses the first", () => {
    const { boxes } = setup();
    expect(boxes).toHaveLength(6);
    expect(boxes[0]).toHaveAttribute("inputmode", "numeric");
    expect(boxes[0]).toHaveAttribute("autocomplete", "one-time-code");
    expect(boxes[5]).toHaveAccessibleName("Digit 6 of 6");
    expect(document.activeElement).toBe(boxes[0]);
  });

  it("advances as you type and submits once all six are in", () => {
    const { boxes, onComplete } = setup();
    "418209".split("").forEach((digit, index) => {
      fireEvent.change(boxes[index], { target: { value: digit } });
      if (index < 5) expect(document.activeElement).toBe(boxes[index + 1]);
    });
    expect(values(boxes)).toBe("418209");
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("418209");
  });

  it("ignores anything that isn't a digit", () => {
    const { boxes } = setup();
    fireEvent.change(boxes[0], { target: { value: "a" } });
    expect(boxes[0].value).toBe("");
  });

  it("steps back and clears on backspace from an empty box", () => {
    const { boxes } = setup();
    fireEvent.change(boxes[0], { target: { value: "1" } });
    fireEvent.change(boxes[1], { target: { value: "2" } });
    fireEvent.keyDown(boxes[2], { key: "Backspace" });
    expect(values(boxes)).toBe("1");
    expect(document.activeElement).toBe(boxes[1]);
  });

  it("fills every box when a full code is pasted into any of them", () => {
    const { boxes, onComplete } = setup();
    fireEvent.paste(boxes[3], { clipboardData: { getData: () => "987 654" } });
    expect(values(boxes)).toBe("987654");
    expect(onComplete).toHaveBeenCalledWith("987654");
  });

  it("pastes a partial code from the box you're in", () => {
    const { boxes, onComplete } = setup();
    fireEvent.paste(boxes[2], { clipboardData: { getData: () => "12" } });
    expect(boxes.map((box) => box.value)).toEqual(["", "", "1", "2", "", ""]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("accepts a phone's one-time-code autofill landing in the first box", () => {
    const { boxes, onComplete } = setup();
    fireEvent.change(boxes[0], { target: { value: "654321" } });
    expect(values(boxes)).toBe("654321");
    expect(onComplete).toHaveBeenCalledWith("654321");
  });

  it("shows the error state on every box", () => {
    const { boxes } = setup({ invalid: true, describedBy: "code-error" });
    expect(screen.getByRole("group", { name: "6-digit code" })).toHaveClass("animate-shake");
    for (const box of boxes) {
      expect(box).toHaveAttribute("aria-invalid", "true");
      expect(box).toHaveAttribute("aria-describedby", "code-error");
    }
  });
});
