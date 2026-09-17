import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";
import { QuickActions } from "./QuickActions";

const base: Item = {
  id: "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11",
  user_id: "u",
  category_id: "c",
  title: "Frieren",
  status: "in_progress",
  rating: null,
  progress_current: 7,
  progress_total: 28,
  notes: null,
  cover_url: null,
  backdrop_url: null,
  accent_color: null,
  year: 2023,
  source: "manual",
  external_id: null,
  is_favorite: false,
  started_at: null,
  finished_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function setup(overrides: Partial<Item> = {}, kind: CategoryKind = "anime") {
  const item = { ...base, ...overrides };
  const actions = {
    onStatusChange: vi.fn(),
    onIncrement: vi.fn(),
    onToggleFavorite: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<QuickActions item={item} kind={kind} href="/c/anime?item=1" actions={actions} />);
  return { item, actions };
}

describe("QuickActions", () => {
  afterEach(cleanup);

  it("names the group after the title and says the current status", () => {
    setup();
    expect(screen.getByRole("group", { name: "Frieren actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status: Watching" })).toBeInTheDocument();
  });

  it("adds one and toggles the favourite", () => {
    const { item, actions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add 1 to progress" }));
    expect(actions.onIncrement).toHaveBeenCalledWith(item);

    const favourite = screen.getByRole("button", { name: "Favourite" });
    expect(favourite).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(favourite);
    expect(actions.onToggleFavorite).toHaveBeenCalledWith(item);
  });

  it("can't add to a finished title, and movies don't count at all", () => {
    setup({ status: "completed", progress_current: 28 });
    expect(screen.getByRole("button", { name: "Add 1 to progress" })).toBeDisabled();
    cleanup();

    setup({ progress_total: null }, "movie");
    expect(screen.queryByRole("button", { name: "Add 1 to progress" })).not.toBeInTheDocument();
  });

  it("uses the shelf's own status words", () => {
    setup({ status: "planned" }, "game");
    expect(screen.getByRole("button", { name: "Status: Backlog" })).toBeInTheDocument();
  });
});
