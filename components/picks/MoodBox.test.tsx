import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MoodBox } from "./MoodBox";

describe("MoodBox", () => {
  let replace: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    replace = vi.spyOn(window.history, "replaceState");
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const send = (text: string) => {
    const field = screen.getByRole("searchbox", { name: "Mood" });
    fireEvent.change(field, { target: { value: text } });
    fireEvent.submit(field.closest("form")!);
    return field as HTMLInputElement;
  };

  it("makes any word the mood, keeping the shelf, and clears itself", () => {
    render(<MoodBox shelf="movies" />);
    const field = send("  Time   Travel ");
    expect(replace).toHaveBeenCalledWith(null, "", "/for-you?shelf=movies&mood=time+travel");
    expect(field.value).toBe("");
  });

  it("picks the mood a word means", () => {
    render(<MoodBox shelf={null} />);
    send("Military");
    expect(replace).toHaveBeenCalledWith(null, "", "/for-you?mood=war");
  });

  it("says what it wants instead of sending nothing or nonsense", () => {
    render(<MoodBox shelf={null} />);
    send("   ");
    expect(screen.getByRole("status")).toHaveTextContent("Type a word or two, like heist or time travel.");
    send("<script>");
    expect(screen.getByRole("status")).toHaveTextContent("Letters and numbers only, up to 40 of them.");
    expect(replace).not.toHaveBeenCalled();
    // Typing again clears the hint.
    fireEvent.change(screen.getByRole("searchbox", { name: "Mood" }), { target: { value: "heist" } });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
