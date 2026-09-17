import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/items";
import type { SearchResponse } from "@/lib/search/types";

let response: SearchResponse | undefined;
vi.mock("./useMetadataSearch", () => ({
  MIN_QUERY: 2,
  useMetadataSearch: (_kind: string, query: string) => ({
    response: query.trim().length >= 2 ? response : undefined,
    loading: false,
    idle: query.trim().length < 2,
  }),
}));
vi.mock("next/image", () => ({ default: () => null }));

const { AddTitlePanel } = await import("./AddTitlePanel");

const frieren = { source: "anilist" as const, externalId: "154587", title: "Frieren", year: 2023, subtitle: "TV · 28 eps" };
const onePiece = { source: "anilist" as const, externalId: "21", title: "One Piece", year: 1999, subtitle: "TV · Airing" };

function setup(items: Partial<Item>[] = []) {
  const props = {
    onAdd: vi.fn(),
    onOpenExisting: vi.fn(),
    onManual: vi.fn(),
  };
  render(
    <AddTitlePanel
      open
      onOpenChange={vi.fn()}
      category={{ id: "c1", name: "Anime", color: "crimson", kind: "anime" }}
      items={items as Item[]}
      defaultStatus="planned"
      {...props}
    />,
  );
  const input = screen.getByRole("combobox");
  const type = (text: string) => fireEvent.change(input, { target: { value: text } });
  const key = (name: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(input, { key: name, ...init });
  return { ...props, input, type, key };
}

describe("AddTitlePanel", () => {
  beforeAll(() => {
    // cmdk measures and scrolls its list; jsdom has neither.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => {};
  });
  beforeEach(() => {
    response = { results: [frieren, onePiece] };
  });
  afterEach(cleanup);

  it("invites a search, then lists results with their meta line", () => {
    const { type } = setup();
    expect(screen.getByText("Type a title and we'll look it up on AniList.")).toBeInTheDocument();
    type("frieren");
    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining("Frieren2023 · TV · 28 eps"),
      expect.stringContaining("One Piece1999 · TV · Airing"),
      expect.stringContaining("Add “frieren” manually"),
    ]);
  });

  it("adds the highlighted result as the shelf's default status on Enter", () => {
    const { type, key, onAdd } = setup();
    type("frieren");
    key("Enter");
    expect(onAdd).toHaveBeenCalledWith(frieren, "planned", false);
  });

  it("steps the status with ←→ once you're moving through results, not while typing", () => {
    const { type, key, onAdd } = setup();
    type("frieren");
    key("ArrowRight");
    expect(screen.getByText("Plan to Watch")).toBeInTheDocument();

    key("ArrowDown");
    key("ArrowRight");
    expect(screen.getByText("Watching")).toBeInTheDocument();
    key("Enter");
    expect(onAdd).toHaveBeenCalledWith(onePiece, "in_progress", false);
  });

  it("adds and opens with Alt+Enter", () => {
    const { type, key, onAdd } = setup();
    type("frieren");
    key("Enter", { altKey: true });
    expect(onAdd).toHaveBeenCalledWith(frieren, "planned", true);
  });

  it("marks a title that's already on the shelf and opens it instead of adding", () => {
    const { type, key, onAdd, onOpenExisting } = setup([
      { id: "existing", title: "frieren", status: "completed", source: "manual", external_id: null },
    ]);
    type("frieren");
    const [first] = screen.getAllByRole("option");
    expect(within(first).getAllByText("Already on your list (Completed)").length).toBeGreaterThan(0);
    key("Enter");
    expect(onOpenExisting).toHaveBeenCalledWith("existing");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("hands the typed title to manual add from the last row", () => {
    const { type, key, onManual } = setup();
    type("  verm ");
    key("ArrowUp");
    key("Enter");
    expect(onManual).toHaveBeenCalledWith("verm");
  });

  it("says when the provider is down, and still offers manual add", () => {
    response = { results: [], error: "unavailable" };
    const { type } = setup();
    type("frieren");
    expect(screen.getByText("AniList isn't answering right now. Try again, or add it by hand.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Add “frieren” manually/ })).toBeInTheDocument();
  });
});
