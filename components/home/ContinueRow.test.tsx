import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/items";
import type { PaletteCategory } from "@/lib/palette";

const increment = vi.fn();
vi.mock("@/components/items/useItemActions", () => ({
  useItemActions: (items: Item[]) => ({ items, increment, stamps: new Set<string>(), endStamp: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({ default: () => null }));

const { ContinueRow } = await import("./ContinueRow");

const anime: PaletteCategory = { id: "a", name: "Anime", slug: "anime", color: "crimson", icon: "sparkles", kind: "anime" };
const movies: PaletteCategory = { id: "m", name: "Movies", slug: "movies", color: "amber", icon: "clapperboard", kind: "movie" };

const item = (overrides: Partial<Item>): Item => ({
  id: "i",
  user_id: "u",
  category_id: "a",
  title: "Untitled",
  status: "in_progress",
  rating: null,
  progress_current: 0,
  progress_total: null,
  notes: null,
  cover_url: null,
  backdrop_url: null,
  accent_color: null,
  genres: [],
  community_score: null,
  year: null,
  source: "manual",
  external_id: null,
  is_favorite: false,
  started_at: null,
  finished_at: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

describe("ContinueRow", () => {
  afterEach(() => {
    cleanup();
    increment.mockReset();
  });

  it("shows where you're up to, and +1 only where there's something to count", () => {
    const frieren = item({ id: "f", title: "Frieren", progress_current: 7, progress_total: 28, year: 2023 });
    const dune = item({ id: "d", title: "Dune", category_id: "m" });
    render(<ContinueRow items={[frieren, dune]} shelves={[anime, movies]} />);

    const [first, second] = screen.getAllByRole("article");
    expect(first).toHaveTextContent("07 / 28");
    expect(first).toHaveTextContent("25%");
    expect(first).toHaveTextContent("2023 · 28 eps");
    expect(within(first).getByRole("link", { name: "Frieren" })).toHaveAttribute("href", "/c/anime?item=f");
    fireEvent.click(within(first).getByRole("button", { name: "Add 1 to Frieren" }));
    expect(increment).toHaveBeenCalledWith(frieren);

    expect(second).toHaveTextContent("Watching");
    expect(within(second).queryByRole("button")).toBeNull();
  });

  it("keeps extra cards behind See all", () => {
    const items = ["One", "Two", "Three", "Four"].map((title, index) => item({ id: String(index), title }));
    render(<ContinueRow items={items} shelves={[anime]} />);
    const toggle = screen.getByRole("button", { name: "See all 4" });
    expect(screen.getAllByRole("listitem")[3]).toHaveClass("hidden");
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("Show less");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem")[3]).not.toHaveClass("hidden");
  });

  it("says so when nothing is in progress, and ignores titles that just finished", () => {
    render(<ContinueRow items={[item({ status: "completed" })]} shelves={[anime]} />);
    expect(screen.getByText(/Nothing in progress/)).toBeInTheDocument();
  });
});
