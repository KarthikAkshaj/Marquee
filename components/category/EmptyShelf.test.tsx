import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATEGORY_PARAMS } from "@/lib/items";
import { EmptyShelf } from "./EmptyShelf";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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

describe("EmptyShelf with nothing on it", () => {
  afterEach(cleanup);

  it("offers to add a title or bring a whole list in", () => {
    const onAdd = vi.fn();
    render(
      <EmptyShelf kind="movie" slug="movies" params={DEFAULT_CATEGORY_PARAMS} reason={{ type: "empty" }} onAdd={onAdd} onClearFilter={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "This shelf is empty." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add a title" }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Import a list" })).toHaveAttribute("href", "/import?category=movies");
  });
});
