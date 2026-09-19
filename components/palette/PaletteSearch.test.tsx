import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaletteCategory, PaletteTitle } from "@/lib/palette";
import type { SearchResponse } from "@/lib/search/types";

const push = vi.fn();
let pathname = "/home";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/image", () => ({ default: () => null }));

const openSurprise = vi.fn();
vi.mock("./PaletteProvider", () => ({ usePalette: () => ({ open: vi.fn(), openSurprise }) }));

const addTitle = vi.fn();
vi.mock("@/components/add/useAddTitle", () => ({ useAddTitle: () => addTitle }));

let response: SearchResponse | undefined;
vi.mock("@/components/add/useMetadataSearch", () => ({
  useMetadataSearch: (kind: string | null, query: string) => ({
    response: kind && query.trim().length >= 2 ? response : undefined,
    loading: false,
    idle: !kind || query.trim().length < 2,
  }),
}));

const { Dialog } = await import("radix-ui");
const { PaletteSearch } = await import("./PaletteSearch");

const shelf = (id: string, name: string, kind: PaletteCategory["kind"]): PaletteCategory => ({
  id,
  name,
  slug: name.toLowerCase(),
  color: "crimson",
  icon: "sparkles",
  kind,
});
const anime = shelf("a", "Anime", "anime");
const movies = shelf("m", "Movies", "movie");
const books = shelf("b", "Books", "custom");

const title = (id: string, name: string, category: PaletteCategory, extra: Partial<PaletteTitle> = {}): PaletteTitle => ({
  id,
  title: name,
  status: "planned",
  year: null,
  cover_url: null,
  accent_color: null,
  source: "manual",
  external_id: null,
  category_id: category.id,
  ...extra,
});
const titles = [
  title("t1", "Frieren", anime),
  title("t2", "Jujutsu Kaisen", anime),
  title("t3", "Dune: Part Two", movies, { status: "completed", source: "tmdb", external_id: "693134" }),
];

function setup() {
  const onClose = vi.fn();
  const onManual = vi.fn();
  render(
    <Dialog.Root open>
      <Dialog.Content aria-describedby={undefined}>
        <Dialog.Title>Search Marquee</Dialog.Title>
        <PaletteSearch categories={[anime, movies, books]} titles={titles} onClose={onClose} onManual={onManual} />
      </Dialog.Content>
    </Dialog.Root>,
  );
  const input = screen.getByRole("combobox");
  return {
    onClose,
    onManual,
    type: (text: string) => fireEvent.change(input, { target: { value: text } }),
    key: (name: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(input, { key: name, ...init }),
    options: () => screen.getAllByRole("option").map((option) => option.textContent),
  };
}

describe("PaletteSearch", () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => {};
  });
  beforeEach(() => {
    pathname = "/home";
    push.mockReset();
    addTitle.mockReset();
    response = undefined;
  });
  afterEach(cleanup);

  it("starts with recent titles, every place and the actions", () => {
    const { options } = setup();
    const all = options();
    expect(all.slice(0, 3)).toEqual([
      expect.stringContaining("Frieren"),
      expect.stringContaining("Jujutsu Kaisen"),
      expect.stringContaining("Dune: Part Two"),
    ]);
    expect(all).toEqual(expect.arrayContaining([expect.stringContaining("Home"), expect.stringContaining("Settings · Account"), "New category"]));
  });

  it("opens a title's sheet on its shelf", () => {
    const { type, key, onClose } = setup();
    type("jk");
    key("Enter");
    expect(onClose).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/c/anime?item=t2");
  });

  it("goes to places by name or keyword", () => {
    const { type, key } = setup();
    type("email");
    key("Enter");
    expect(push).toHaveBeenCalledWith("/settings/account");
  });

  it("adds to the shelf you're on, in the status you stepped to", () => {
    pathname = "/c/movies";
    response = { results: [{ source: "tmdb", externalId: "438631", title: "Dune", year: 2021 }] };
    const { type, key } = setup();
    type("dune");
    expect(screen.getByRole("button", { name: /Add to Movies/ })).toBeInTheDocument();
    key("ArrowDown");
    key("ArrowRight");
    key("Enter");
    expect(addTitle).toHaveBeenCalledWith(movies, response.results[0], "in_progress", false);
  });

  it("opens the copy you already have instead of adding it again", () => {
    pathname = "/c/movies";
    response = { results: [{ source: "tmdb", externalId: "693134", title: "Dune: Part Two", year: 2024 }] };
    const { type, key } = setup();
    type("dune part two");
    expect(screen.getAllByText("Already on your list (Watched)").length).toBeGreaterThan(0);
    key("ArrowDown");
    key("Enter");
    expect(push).toHaveBeenCalledWith("/c/movies?item=t3");
    expect(addTitle).not.toHaveBeenCalled();
  });

  it("adds and opens with Alt+Enter", () => {
    response = { results: [{ source: "anilist", externalId: "127230", title: "Chainsaw Man", year: 2022 }] };
    const { type, key } = setup();
    type("chainsaw man");
    key("Enter", { altKey: true });
    expect(addTitle).toHaveBeenCalledWith(anime, response.results[0], "planned", true);
  });

  it("hands a custom shelf's title to manual add", () => {
    pathname = "/c/books";
    const { type, key, onManual, options } = setup();
    type("verm");
    expect(options()).toEqual([expect.stringContaining("Add “verm” to Books manually")]);
    key("Enter");
    expect(onManual).toHaveBeenCalledWith(books, "verm", "planned");
  });
});

describe("PaletteSearch actions", () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => {};
  });
  afterEach(cleanup);

  it("spins Surprise me from the palette", () => {
    const { type, key, onClose } = setup();
    type("surprise");
    key("Enter");
    expect(onClose).toHaveBeenCalled();
    expect(openSurprise).toHaveBeenCalled();
  });
});
