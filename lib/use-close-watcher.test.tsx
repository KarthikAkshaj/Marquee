import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCloseWatcher } from "./use-close-watcher";

class FakeWatcher {
  static live: FakeWatcher[] = [];
  listeners: (() => void)[] = [];
  destroyed = false;
  constructor() {
    FakeWatcher.live.push(this);
  }
  addEventListener(_type: "close", listener: () => void) {
    this.listeners.push(listener);
  }
  destroy() {
    this.destroyed = true;
  }
  /** What the browser does on Android's back button. */
  back() {
    for (const listener of this.listeners) listener();
  }
}

function Panel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useCloseWatcher(open, onClose);
  return null;
}

describe("useCloseWatcher", () => {
  afterEach(() => {
    cleanup();
    FakeWatcher.live = [];
    Reflect.deleteProperty(window, "CloseWatcher");
  });

  it("closes the open panel on the back button, and lets go once it's shut", () => {
    Object.defineProperty(window, "CloseWatcher", { configurable: true, value: FakeWatcher });
    const onClose = vi.fn();
    const { rerender } = render(<Panel open onClose={onClose} />);
    expect(FakeWatcher.live).toHaveLength(1);

    FakeWatcher.live[0].back();
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<Panel open={false} onClose={onClose} />);
    expect(FakeWatcher.live[0].destroyed).toBe(true);
  });

  it("asks for nothing while closed", () => {
    Object.defineProperty(window, "CloseWatcher", { configurable: true, value: FakeWatcher });
    render(<Panel open={false} onClose={vi.fn()} />);
    expect(FakeWatcher.live).toHaveLength(0);
  });

  it("does nothing where the browser has no CloseWatcher", () => {
    expect(() => render(<Panel open onClose={vi.fn()} />)).not.toThrow();
  });
});
