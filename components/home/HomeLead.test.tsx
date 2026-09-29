import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/items";
import type { PaletteCategory } from "@/lib/palette";

const increment = vi.fn();
const setStatus = vi.fn();
vi.mock("@/components/items/useItemActions", () => ({
  useItemActions: (items: Item[]) => ({ items, increment, setStatus, stamps: new Set<string>(), endStamp: vi.fn() }),
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
const games: PaletteCategory = { id: "g", name: "Games", slug: "games", color: "teal", icon: "gamepad", kind: "game" };

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
const spotlight = () => document.getElementById("spotlight-title")!;

describe("HomeLead", () => {
  afterEach(() => {
    cleanup();
    increment.mockReset();
    setStatus.mockReset();
  });

  it("puts the visit's pick in the spotlight and the rest in Continue", () => {
    const frieren = item({ id: "1", title: "Frieren", progress_current: 12, progress_total: 28 });
    const mushishi = item({ id: "2", title: "Mushishi", progress_current: 3, progress_total: 26 });
    render(<HomeLead items={[mushishi, frieren]} featured={frieren} shelves={[anime]} greeting={greeting} />);
    expect(spotlight().textContent).toBe("Frieren");
    expect(screen.getByRole("heading", { level: 1, name: "Evening, you." })).toBeTruthy();
    const row = screen.getByRole("region", { name: "Continue" });
    expect(within(row).getByText("Mushishi")).toBeTruthy();
    expect(within(row).queryByText("Frieren")).toBeNull();
  });

  it("marks the next episode with one press", () => {
    const frieren = item({ id: "1", title: "Frieren", progress_current: 12, progress_total: 28 });
    render(<HomeLead items={[frieren]} featured={frieren} shelves={[anime]} greeting={greeting} />);
    fireEvent.click(screen.getByRole("button", { name: /Episode 13 done, for Frieren/ }));
    expect(increment).toHaveBeenCalledWith(frieren);
  });

  it("starts a planned pick in the shelf's own words, and keeps everything in progress in Continue", () => {
    const frieren = item({ id: "1", title: "Frieren", progress_current: 12, progress_total: 28 });
    const outerWilds = item({ id: "2", title: "Outer Wilds", category_id: "g", status: "planned" });
    render(<HomeLead items={[frieren]} featured={outerWilds} shelves={[anime, games]} greeting={greeting} />);
    expect(spotlight().textContent).toBe("Outer Wilds");
    expect(screen.getByText(/Games · Backlog/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start playing Outer Wilds" }));
    expect(setStatus).toHaveBeenCalledWith(outerWilds, "in_progress");
    expect(within(screen.getByRole("region", { name: "Continue" })).getByText("Frieren")).toBeTruthy();
  });

  it("shows no progress bar at zero on a planned title", () => {
    const lie = item({ id: "1", title: "Your lie in April", status: "planned", progress_total: 22 });
    render(<HomeLead items={[]} featured={lie} shelves={[anime]} greeting={greeting} />);
    expect(screen.queryByText("00 / 22")).toBeNull();
    expect(screen.queryByText("22 to go")).toBeNull();
  });

  it("holds its title when a save elsewhere brings a new pick", () => {
    const frieren = item({ id: "1", title: "Frieren", progress_current: 12, progress_total: 28 });
    const dune = item({ id: "2", title: "Dune", category_id: "m", status: "planned" });
    const outerWilds = item({ id: "3", title: "Outer Wilds", category_id: "g", status: "planned" });
    const shelves = [anime, movies, games];
    const { rerender } = render(<HomeLead items={[frieren]} featured={dune} shelves={shelves} greeting={greeting} />);
    // A +1 on Frieren in Continue: the page comes back with Frieren moved on and a new pick.
    rerender(<HomeLead items={[{ ...frieren, progress_current: 13 }]} featured={outerWilds} shelves={shelves} greeting={greeting} />);
    expect(spotlight().textContent).toBe("Dune");
  });

  it("follows its title once it's started", () => {
    const lie = item({ id: "1", title: "Your lie in April", status: "planned", progress_total: 22 });
    const dune = item({ id: "2", title: "Dune", category_id: "m", status: "planned" });
    const { rerender } = render(<HomeLead items={[]} featured={lie} shelves={[anime, movies]} greeting={greeting} />);
    rerender(<HomeLead items={[{ ...lie, status: "in_progress" }]} featured={dune} shelves={[anime, movies]} greeting={greeting} />);
    expect(spotlight().textContent).toBe("Your lie in April");
    expect(screen.getByRole("button", { name: /Episode 1 done, for Your lie in April/ })).toBeTruthy();
  });

  it("drops the Continue row when the spotlight is the only thing in progress", () => {
    const frieren = item({ id: "1", title: "Frieren" });
    render(<HomeLead items={[frieren]} featured={frieren} shelves={[anime]} greeting={greeting} />);
    expect(screen.queryByRole("region", { name: "Continue" })).toBeNull();
  });

  it("gives a film no +1, only its details", () => {
    const dune = item({ id: "1", title: "Dune", category_id: "m" });
    render(<HomeLead items={[dune]} featured={dune} shelves={[movies]} greeting={greeting} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link", { name: "Details about Dune" }).getAttribute("href")).toBe("/c/movies?item=1");
  });

  it("keeps the plain greeting and Continue when nothing is started or planned", () => {
    render(<HomeLead items={[]} featured={null} shelves={[anime]} greeting={greeting} />);
    expect(screen.getByRole("heading", { level: 2, name: "Continue" })).toBeTruthy();
    expect(screen.getByText(/Nothing in progress/)).toBeTruthy();
    expect(spotlightMissing()).toBe(true);
  });
});

function spotlightMissing() {
  return document.querySelector("section[aria-labelledby=spotlight-title]") === null;
}
