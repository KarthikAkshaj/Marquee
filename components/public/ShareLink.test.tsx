import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareLink } from "./ShareLink";

const URL_ = "https://getmarquee.vercel.app/u/void_flux";

function pointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: coarse && query.includes("coarse"), media: query }));
}

describe("ShareLink", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "share");
  });

  it("copies the link where there's a mouse, and says so", async () => {
    pointer(false);
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ShareLink url={URL_} title="Flux on Marquee" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL_));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("opens the phone's share sheet on a touch screen", async () => {
    pointer(true);
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<ShareLink url={URL_} title="Flux on Marquee" />);
    fireEvent.click(await screen.findByRole("button", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: "Flux on Marquee", url: URL_ }));
  });

  it("takes closing the sheet as a change of mind, not a failure", async () => {
    pointer(true);
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn(async () => {
        throw new DOMException("closed", "AbortError");
      }),
    });
    render(<ShareLink url={URL_} title="Flux on Marquee" />);
    fireEvent.click(await screen.findByRole("button", { name: "Share" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(writeText).not.toHaveBeenCalled();
  });
});
