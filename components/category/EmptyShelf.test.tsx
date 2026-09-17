import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATEGORY_PARAMS } from "@/lib/items";
import { EmptyShelf } from "./EmptyShelf";

vi.mock("next/link", () => ({ default: ({ children }: { children: ReactNode }) => children }));

function renderFilter(kind: "anime" | "custom", onSearch?: (query: string) => void) {
  const onClearFilter = vi.fn();
  render(
    <EmptyShelf
      kind={kind}
      slug="anime"
      params={DEFAULT_CATEGORY_PARAMS}
      reason={{ type: "filter", query: " chainsaw man " }}
      onAdd={vi.fn()}
      onSearch={onSearch}
      onClearFilter={onClearFilter}
    />,
  );
  return { onClearFilter };
}

describe("EmptyShelf filter state", () => {
  afterEach(cleanup);

  it("offers to look the filter text up when the shelf has a provider", () => {
    const onSearch = vi.fn();
    const { onClearFilter } = renderFilter("anime", onSearch);
    expect(screen.getByText("No titles here match “chainsaw man”. Want to add it?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Search AniList for “chainsaw man”" }));
    expect(onSearch).toHaveBeenCalledWith("chainsaw man");
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(onClearFilter).toHaveBeenCalled();
  });

  it("just clears the filter on a custom shelf", () => {
    renderFilter("custom", vi.fn());
    expect(screen.queryByRole("button", { name: /Search/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Clear filter" })).toBeInTheDocument();
  });
});
