import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WELCOME_COOKIE } from "@/lib/auth/welcome";
import { WelcomeStamp } from "./WelcomeStamp";

const nextFrame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

afterEach(() => {
  cleanup();
  document.cookie = `${WELCOME_COOKIE}=; Max-Age=0; Path=/`;
});

describe("WelcomeStamp", () => {
  it("welcomes a sign-in once, and clears the cookie so a reload doesn't", async () => {
    document.cookie = `${WELCOME_COOKIE}=1; Path=/`;
    render(<WelcomeStamp />);
    await nextFrame();
    expect(screen.getByRole("status")).toHaveTextContent("You're in.");
    expect(document.cookie).not.toContain(`${WELCOME_COOKIE}=1`);
  });

  it("stays out of the way on an ordinary visit", async () => {
    render(<WelcomeStamp />);
    await nextFrame();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
