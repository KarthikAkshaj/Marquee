import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaletteCategory } from "@/lib/palette";
import type { SurpriseTitle } from "@/lib/surprise";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ children }: { children: ReactNode }) => children }));
const setItemStatus = vi.fn();
vi.mock("@/lib/actions/items", () => ({ setItemStatus: (...args: unknown[]) => setItemStatus(...args) }));
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...args: unknown[]) => toastSuccess(...args), error: vi.fn() } }));
// The real reel spins for ~2.6s; land straight away.
vi.mock("./SurpriseReel", () => ({
  SurpriseReel: ({ spinKey, onLanded, frames }: { spinKey: number; onLanded: () => void; frames: SurpriseTitle[] }) => {
    useEffect(() => onLanded(), [spinKey, onLanded]);
    return <p data-testid="reel">{frames.length} frames</p>;
  },
}));

const { SurpriseContent } = await import("./SurpriseContent");

const shelf = (id: string, name: string, kind: PaletteCategory["kind"]): PaletteCategory => ({ id, name, slug: name.toLowerCase(), color: "crimson", icon: "sparkles", kind });
const anime = shelf("a", "Anime", "anime");
const movies = shelf("m", "Movies", "movie");
const games = shelf("g", "Games", "game");
const title = (id: string, category: string, extra: Partial<SurpriseTitle> = {}): SurpriseTitle => ({
  id,
  title: id,
  year: 2020,
  cover_url: null,
  accent_color: null,
  category_id: category,
  format: null,
  genres: [],
  runtime_minutes: null,
  progress_total: null,
  reason: null,
  weight: 1,
  ...extra,
});

function setup(titles: SurpriseTitle[], initialCategoryId: string | null = null) {
  const onClose = vi.fn();
  const onAddTitle = vi.fn();
  render(
    <SurpriseContent
      categories={[anime, movies, games]}
      pool={{ titles, personal: true }}
      initialCategoryId={initialCategoryId}
      onClose={onClose}
      onAddTitle={onAddTitle}
    />,
  );
  return { onClose, onAddTitle };
}

const group = (name: string) => within(screen.getByRole("group", { name }));

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
    const { onClose } = setup([title("Pluto", "a"), title("Dune", "m")]);

    expect(group("Pick from").getAllByRole("button").map((b) => b.textContent)).toEqual(["Anything", "Anime", "Movies"]);
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

    fireEvent.click(group("Pick from").getByRole("button", { name: "Movies" }));
    expect(await screen.findByText("Dune")).toBeInTheDocument();
    expect(group("Pick from").getByRole("button", { name: "Movies" })).toHaveAttribute("aria-pressed", "true");
  });

  it("spins only through what fits the time and the mood, and says why and how long", async () => {
    setup([
      title("One Piece", "a", { format: "tv", progress_total: 1100, runtime_minutes: 24, genres: ["Action"] }),
      title("Your Name", "a", { format: "movie", progress_total: 1, runtime_minutes: 106, genres: ["Romance"], reason: "You rate Romance 8.9" }),
      title("Hades", "g", { genres: ["Action"] }),
    ]);
    fireEvent.click(group("How long have you got?").getByRole("button", { name: "An evening" }));
    expect(screen.getByText("A film, or a short run: one to three hours in all.")).toBeInTheDocument();
    expect(await screen.findByText("Your Name")).toBeInTheDocument();
    expect(screen.getByText("You rate Romance 8.9 · 1h 46m")).toBeInTheDocument();

    // No action film for an evening, and games have no length: marked, but still there to pick.
    expect(group("What's the mood?").getByRole("button", { name: "Action, nothing fits" })).toBeEnabled();
    expect(group("Pick from").getByRole("button", { name: "Games, nothing fits" })).toBeEnabled();
    expect(group("What's the mood?").getByRole("button", { name: "Romance" })).toBeEnabled();
  });

  it("says so in words when nothing can be finished in the time, and offers a way out", async () => {
    // Eleven episodes is over four hours: not something to finish in an hour.
    setup([title("Alicization", "a", { format: "tv", progress_total: 11, runtime_minutes: 24 }), title("Your Name", "m", { format: "movie", runtime_minutes: 106 })]);
    fireEvent.click(group("How long have you got?").getByRole("button", { name: "An hour, nothing fits" }));
    expect(screen.getByText("Nothing on your list can be finished in an hour.")).toBeInTheDocument();
    expect(screen.queryByText(/Tonight:/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Just an episode instead" }));
    expect(await screen.findByText("Alicization")).toBeInTheDocument();
    expect(group("How long have you got?").getByRole("button", { name: "Just an episode" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says the queue is empty and offers to add something", () => {
    const { onAddTitle } = setup([]);
    expect(screen.getByText(/Nothing in the/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add a title" }));
    expect(onAddTitle).toHaveBeenCalled();
  });
});
