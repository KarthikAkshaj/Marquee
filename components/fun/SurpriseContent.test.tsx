import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaletteCategory, PaletteTitle } from "@/lib/palette";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ children }: { children: ReactNode }) => children }));
const setItemStatus = vi.fn();
vi.mock("@/lib/actions/items", () => ({ setItemStatus: (...args: unknown[]) => setItemStatus(...args) }));
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...args: unknown[]) => toastSuccess(...args), error: vi.fn() } }));
// The real reel spins for ~2.6s; land straight away.
vi.mock("./SurpriseReel", () => ({
  SurpriseReel: ({ spinKey, onLanded, frames }: { spinKey: number; onLanded: () => void; frames: PaletteTitle[] }) => {
    useEffect(() => onLanded(), [spinKey, onLanded]);
    return <p data-testid="reel">{frames.length} frames</p>;
  },
}));

const { SurpriseContent } = await import("./SurpriseContent");

const shelf = (id: string, name: string): PaletteCategory => ({ id, name, slug: name.toLowerCase(), color: "crimson", icon: "sparkles", kind: "anime" });
const anime = shelf("a", "Anime");
const movies = shelf("m", "Movies");
const games = shelf("g", "Games");
const title = (id: string, category: string, status: PaletteTitle["status"] = "planned"): PaletteTitle => ({
  id,
  title: id,
  status,
  year: 2020,
  cover_url: null,
  accent_color: null,
  source: "manual",
  external_id: null,
  category_id: category,
});

function setup(titles: PaletteTitle[], initialCategoryId: string | null = null) {
  const onClose = vi.fn();
  const onAddTitle = vi.fn();
  render(<SurpriseContent categories={[anime, movies, games]} titles={titles} initialCategoryId={initialCategoryId} onClose={onClose} onAddTitle={onAddTitle} />);
  return { onClose, onAddTitle };
}

describe("SurpriseContent", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    setItemStatus.mockReset();
    toastSuccess.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("offers only shelves with something waiting, lands on a pick, and starts it", async () => {
    setItemStatus.mockResolvedValue({ ok: true });
    const { onClose } = setup([title("Pluto", "a"), title("Dune", "m"), title("Hades", "g", "completed")]);

    expect(screen.getAllByRole("button", { name: /Anything|Anime|Movies|Games/ }).map((b) => b.textContent)).toEqual(["Anything", "Anime", "Movies"]);
    expect(await screen.findByText("Pluto")).toBeInTheDocument();
    expect(screen.getByText(/Tonight:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start it" }));
    await waitFor(() => expect(setItemStatus).toHaveBeenCalledWith("Pluto", "in_progress"));
    expect(onClose).toHaveBeenCalled();
    expect(toastSuccess.mock.calls[0][0]).toBe("Started Pluto. Enjoy the show.");
  });

  it("spins again to something else, and sticks to the chosen shelf", async () => {
    setup([title("Pluto", "a"), title("Monster", "a"), title("Dune", "m")], "a");
    expect(await screen.findByText("Pluto")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Spin again" }));
    expect(await screen.findByText("Monster")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Movies" }));
    expect(await screen.findByText("Dune")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Movies" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says the queue is empty and offers to add something", () => {
    const { onAddTitle } = setup([title("Hades", "g", "completed")]);
    expect(screen.getByText(/Nothing in the/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add a title" }));
    expect(onAddTitle).toHaveBeenCalled();
  });
});
