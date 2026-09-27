import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/items";
import type { SearchResponse, SeriesResponse } from "@/lib/search/types";

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
const secondSeason = { source: "anilist" as const, externalId: "182255", title: "Frieren Season 2", year: 2026, subtitle: "TV · 10 eps", release: "out" as const };
const thirdSeason = { source: "anilist" as const, externalId: "190000", title: "Frieren Season 3", subtitle: "TV · Upcoming", release: "upcoming" as const };

/** What /api/search?related= answers with: the rest of the run. */
let series: SeriesResponse;
const fetchRelated = vi.fn(async () => ({ json: async () => series }));

function setup(items: Partial<Item>[] = []) {
  const props = {
    onAdd: vi.fn(),
    onAddMore: vi.fn(),
    onOpenChange: vi.fn(),
    onOpenExisting: vi.fn(),
    onManual: vi.fn(),
  };
  render(
    <AddTitlePanel
      open
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
    series = { results: [{ ...frieren, release: "out" }] };
    fetchRelated.mockClear();
    vi.stubGlobal("fetch", fetchRelated);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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

  it("adds and opens with Alt+Enter, skipping the rest of the series", () => {
    const { type, key, onAdd, onOpenChange } = setup();
    type("frieren");
    key("Enter", { altKey: true });
    expect(onAdd).toHaveBeenCalledWith(frieren, "planned", true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(fetchRelated).not.toHaveBeenCalled();
  });

  it("offers the rest of the series after an add, and adds only what's ticked", async () => {
    series = { results: [{ ...frieren, release: "out" }, secondSeason, thirdSeason] };
    const { type, key, onAddMore, onOpenChange } = setup();
    type("frieren");
    key("Enter");

    expect(await screen.findByText("Just added")).toBeInTheDocument();
    expect(fetchRelated).toHaveBeenCalledWith("/api/search?kind=anime&related=154587");
    expect(screen.getByRole("heading", { name: "Frieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Add Frieren Season 3" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Add Frieren Season 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add 2" }));
    // Release order, whatever order they were ticked in. Not out yet means planned.
    expect(onAddMore).toHaveBeenCalledWith([
      { result: secondSeason, status: "planned" },
      { result: thirdSeason, status: "planned" },
    ]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("starts ticked seasons from the status the first one went on as", async () => {
    series = { results: [{ ...frieren, release: "out" }, secondSeason, thirdSeason] };
    const { type, key, onAddMore } = setup();
    type("frieren");
    key("ArrowDown");
    key("ArrowUp");
    key("ArrowRight");
    key("ArrowRight");
    key("Enter");

    fireEvent.click(await screen.findByRole("checkbox", { name: "Add Frieren Season 2" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Add Frieren Season 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Add 2" }));
    expect(onAddMore).toHaveBeenCalledWith([
      { result: secondSeason, status: "completed" },
      { result: thirdSeason, status: "planned" },
    ]);
  });

  it("marks seasons already on the shelf instead of offering them", async () => {
    series = { results: [{ ...frieren, release: "out" }, secondSeason, thirdSeason] };
    const { type, key } = setup([{ id: "s2", title: "Frieren Season 2", status: "completed", source: "anilist", external_id: "182255" }]);
    type("frieren");
    key("Enter");

    expect(await screen.findByText("On your shelf")).toBeInTheDocument();
    // Hidden, not just greyed: it can't be ticked or tabbed to.
    expect(screen.getByRole("checkbox", { name: "Add Frieren Season 2" }).closest("label")).toHaveClass("invisible");
    expect(screen.getByRole("checkbox", { name: "Add Frieren Season 3" }).closest("label")).not.toHaveClass("invisible");
  });

  it("closes by itself when there's nothing else to add, or the lookup fails", async () => {
    const { type, key, onOpenChange, onAddMore } = setup();
    type("frieren");
    key("Enter");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onAddMore).not.toHaveBeenCalled();

    cleanup();
    series = { results: [], error: "unavailable" };
    const again = setup();
    again.type("frieren");
    again.key("Enter");
    await waitFor(() => expect(again.onOpenChange).toHaveBeenCalledWith(false));
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
