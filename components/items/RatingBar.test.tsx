import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RatingBar } from "./RatingBar";

function setup(value: number | null) {
  const onChange = vi.fn();
  const { container } = render(<RatingBar value={value} onChange={onChange} />);
  const slider = screen.getByRole("slider", { name: "Rating" });
  const bars = Array.from(slider.children) as HTMLElement[];
  return { onChange, slider, bars, container };
}

describe("RatingBar", () => {
  afterEach(cleanup);

  it("reads out as whole numbers out of ten", () => {
    const { slider, bars } = setup(8);
    expect(bars).toHaveLength(10);
    expect(slider).toHaveAttribute("aria-valuenow", "8");
    expect(slider).toHaveAttribute("aria-valuetext", "8 out of 10");
    expect(screen.getByText("8 / 10")).toBeInTheDocument();
  });

  it("sets a rating by clicking a bar, and clears it by clicking the same one", () => {
    const { onChange, bars } = setup(8);
    fireEvent.click(bars[5]);
    expect(onChange).toHaveBeenLastCalledWith(6);
    fireEvent.click(bars[7]);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("moves with the arrow keys and clears below one", () => {
    const { onChange, slider } = setup(1);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.keyDown(slider, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it("says when nothing's rated", () => {
    const { slider } = setup(null);
    expect(slider).toHaveAttribute("aria-valuetext", "Not rated");
    expect(screen.getByText("Not rated")).toBeInTheDocument();
  });
});
