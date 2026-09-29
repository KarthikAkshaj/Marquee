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
vi.mock("next/image", () => ({
  default: () => <span />,
  getImageProps: ({ src }: { src: string }) => ({ props: { src, srcSet: src } }),
}));

const { HomeLead } = await import("./HomeLead");

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
  tags: null,
  community_score: null,
  runtime_minutes: null,
  format: null,
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

const greeting = <h1>Evening, you.</h1>;

describe("HomeLead", () => {
  afterEach(() => {
    cleanup();
    increment.mockReset();
  });

  it("puts the title you last touched in the spotlight and the rest in Continue", () => {
    render(
      <HomeLead
        items={[
          item({ id: "1", title: "Frieren", progress_current: 12, progress_total: 28 }),
          item({ id: "2", title: "Mushishi", progress_current: 3, progress_total: 26 }),
        ]}
        shelves={[anime]}
        greeting={greeting}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Frieren" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Evening, you." })).toBeTruthy();
    const row = screen.getByRole("region", { name: "Continue" });
    expect(within(row).getByText("Mushishi")).toBeTruthy();
    expect(within(row).queryByText("Frieren")).toBeNull();
  });

  it("marks the next episode with one press", () => {
    const frieren = item({ id: "1", title: "Frieren", progress_current: 12, progress_total: 28 });
    render(<HomeLead items={[frieren]} shelves={[anime]} greeting={greeting} />);
    fireEvent.click(screen.getByRole("button", { name: /Episode 13 done, for Frieren/ }));
    expect(increment).toHaveBeenCalledWith(frieren);
  });

  it("drops the Continue row when the spotlight is the only thing in progress", () => {
    render(<HomeLead items={[item({ id: "1", title: "Frieren" })]} shelves={[anime]} greeting={greeting} />);
    expect(screen.queryByRole("region", { name: "Continue" })).toBeNull();
  });

  it("gives a film no +1, only its details", () => {
    render(<HomeLead items={[item({ id: "1", title: "Dune", category_id: "m" })]} shelves={[movies]} greeting={greeting} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link", { name: "Details about Dune" }).getAttribute("href")).toBe("/c/movies?item=1");
  });

  it("keeps the plain greeting and Continue when nothing is in progress", () => {
    render(<HomeLead items={[]} shelves={[anime]} greeting={greeting} />);
    expect(screen.getByRole("heading", { level: 2, name: "Continue" })).toBeTruthy();
    expect(screen.getByText(/Nothing in progress/)).toBeTruthy();
    expect(spotlightMissing()).toBe(true);
  });
});

function spotlightMissing() {
  return document.querySelector("section[aria-labelledby=spotlight-title]") === null;
}
