import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { MouseEventHandler, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PickShelf } from "@/lib/recommend";
import type { SearchResult } from "@/lib/search/types";

let params = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
type LinkProps = { href: string; className?: string; "aria-label"?: string; onClick?: MouseEventHandler; children?: ReactNode };
vi.mock("next/link", () => ({
  // Only what an <a> takes: next/link's own props (scroll) aren't attributes.
  default: ({ href, className, "aria-label": label, onClick, children }: LinkProps) => (
    <a href={href} className={className} aria-label={label} onClick={onClick}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({ default: () => <span /> }));

const addFromSearch = vi.fn();
const deleteItem = vi.fn();
const dismissPick = vi.fn();
const restorePick = vi.fn();
vi.mock("@/lib/actions/items", () => ({
  addFromSearch: (input: unknown) => addFromSearch(input),
  deleteItem: (id: string) => deleteItem(id),
}));
vi.mock("@/lib/actions/picks", () => ({
  dismissPick: (key: unknown) => dismissPick(key),
  restorePick: (key: unknown) => restorePick(key),
}));

const announceAdded = vi.fn();
vi.mock("@/components/add/announceAdded", () => ({ announceAdded: (...args: unknown[]) => announceAdded(...args) }));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) } }));

const { NewPicks } = await import("./NewPicks");

const anime: PickShelf = { id: "a", name: "Anime", slug: "anime", kind: "anime", color: "crimson" };
const films: PickShelf = { id: "f", name: "Movies", slug: "movies", kind: "movie", color: "amber" };

function pick(id: string, shelf: PickShelf, overrides: Partial<SearchResult> = {}) {
  const source = shelf === anime ? "anilist" : "tmdb";
  return {
    key: `${source}:${id}`,
    result: { source, externalId: id, title: `Title ${id}`, year: 2020, ...overrides } as SearchResult,
    categoryId: shelf.id,
    reason: "Because you loved Frieren",
  };
}

const picks = [...Array.from({ length: 8 }, (_, index) => pick(String(index + 1), anime)), pick("90", films, { title: "Dune: Part Two" })];

beforeEach(() => {
  params = new URLSearchParams();
  addFromSearch.mockResolvedValue({ ok: true });
  deleteItem.mockResolvedValue({ ok: true });
  dismissPick.mockResolvedValue({ ok: true });
  restorePick.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NewPicks", () => {
  it("groups everything by shelf, six each, with the way to the rest", () => {
    render(<NewPicks initial={{ picks: picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    const animeGroup = screen.getByRole("heading", { name: "Anime" }).parentElement!.parentElement!;
    expect(within(animeGroup).getAllByRole("button", { name: /^Plan it/ })).toHaveLength(6);
    expect(within(animeGroup).getByRole("link", { name: "All 8 Anime picks" })).toHaveAttribute("href", "/for-you?shelf=anime");
    expect(screen.getByRole("heading", { name: "Dune: Part Two" })).toBeInTheDocument();
    // TMDB's attribution goes wherever its data shows.
    expect(screen.getByText(/uses the TMDB API/)).toBeInTheDocument();
  });

  it("shows all of one shelf's picks when it's chosen", () => {
    params = new URLSearchParams("shelf=anime");
    render(<NewPicks initial={{ picks: picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    expect(screen.getAllByRole("button", { name: /^Plan it/ })).toHaveLength(8);
    expect(screen.queryByText("Dune: Part Two")).not.toBeInTheDocument();
    expect(screen.queryByText(/uses the TMDB API/)).not.toBeInTheDocument();
  });

  it("plans a title onto its shelf, then links to it there", async () => {
    render(<NewPicks initial={{ picks: picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    fireEvent.click(screen.getByRole("button", { name: "Plan it: Dune: Part Two" }));

    const link = await screen.findByRole("link", { name: "On Movies" });
    const [input] = addFromSearch.mock.calls[0] as [{ id: string; categoryId: string; status: string; result: SearchResult }];
    expect(input).toMatchObject({ categoryId: "f", status: "planned", result: { externalId: "90" } });
    expect(link).toHaveAttribute("href", `/c/movies?item=${input.id}`);
    expect(announceAdded).toHaveBeenCalledWith(expect.objectContaining({ id: input.id, title: "Dune: Part Two" }), "Movies", expect.any(Function));

    // Undo from the toast takes it off the shelf and offers it again.
    (announceAdded.mock.calls[0] as [unknown, string, () => void])[2]();
    expect(await screen.findByRole("button", { name: "Plan it: Dune: Part Two" })).toBeEnabled();
    expect(deleteItem).toHaveBeenCalledWith(input.id);
  });

  it("puts the button back and says why when the add fails", async () => {
    addFromSearch.mockResolvedValue({ ok: false, message: "That shelf isn't there anymore." });
    render(<NewPicks initial={{ picks: picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    fireEvent.click(screen.getByRole("button", { name: "Plan it: Dune: Part Two" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("That shelf isn't there anymore."));
    expect(screen.getByRole("button", { name: "Plan it: Dune: Part Two" })).toBeEnabled();
  });

  it("takes a title away at once for 'not for me', with Undo", async () => {
    render(<NewPicks initial={{ picks: picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    fireEvent.click(screen.getByRole("button", { name: "Not for me: Dune: Part Two" }));
    expect(screen.queryByText("Dune: Part Two")).not.toBeInTheDocument();

    // What it was about goes too, so the picks can learn from it.
    await waitFor(() => expect(dismissPick).toHaveBeenCalledWith({ source: "tmdb", externalId: "90", genres: [], tags: [] }));
    const [, options] = toastSuccess.mock.calls[0] as [string, { action: { onClick: () => void } }];
    expect(toastSuccess.mock.calls[0][0]).toBe("Dune: Part Two won't come up again.");
    options.action.onClick();
    expect(await screen.findByText("Dune: Part Two")).toBeInTheDocument();
    expect(restorePick).toHaveBeenCalledWith({ source: "tmdb", externalId: "90" });
  });

  it("brings the card back if 'not for me' couldn't be saved", async () => {
    dismissPick.mockResolvedValue({ ok: false, message: "Couldn't save that. Try again." });
    render(<NewPicks initial={{ picks: picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    fireEvent.click(screen.getByRole("button", { name: "Not for me: Dune: Part Two" }));
    expect(await screen.findByText("Dune: Part Two")).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith("Couldn't save that. Try again.");
  });

  it("explains an empty shelf, and says what to do with nothing at all", () => {
    render(<NewPicks initial={{ picks: [], notices: { f: "TMDB isn't answering right now. Try again in a bit." }, mood: "" }} shelves={[anime, films]} />);
    expect(screen.getByText("TMDB isn't answering right now. Try again in a bit.")).toBeInTheDocument();
    cleanup();
    render(<NewPicks initial={{ picks: [], notices: {}, mood: "" }} shelves={[anime]} />);
    expect(screen.getByText(/Rate a few titles 8 or more/)).toBeInTheDocument();
  });

  it("keeps the mood in the way to a shelf's other picks", () => {
    params = new URLSearchParams("mood=war");
    render(<NewPicks initial={{ picks, notices: {}, mood: "war" }} shelves={[anime, films]} />);
    expect(screen.getByRole("link", { name: "All 8 Anime picks" })).toHaveAttribute("href", "/for-you?shelf=anime&mood=war");
    expect(screen.getByText("War & military, best fit first")).toBeInTheDocument();
  });

  it("fetches a mood the page didn't open with, then keeps it", async () => {
    const fetch = vi.fn(async () => Response.json({ picks: [pick("77", films, { title: "Band of Brothers" })], notices: {} }));
    vi.stubGlobal("fetch", fetch);
    params = new URLSearchParams("mood=military");
    const { rerender } = render(<NewPicks initial={{ picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    expect(screen.getByText("Finding the best War & military for you…")).toBeInTheDocument();
    expect(await screen.findByText("Band of Brothers")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/picks?mood=war", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    // Back to no mood: what the page opened with, with no fetch.
    params = new URLSearchParams();
    rerender(<NewPicks initial={{ picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    expect(screen.getByText("Dune: Part Two")).toBeInTheDocument();
    params = new URLSearchParams("mood=war");
    rerender(<NewPicks initial={{ picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    expect(screen.getByText("Band of Brothers")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("says why a mood couldn't load, and tries again", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(Response.json({ picks: [], notices: { f: "Nothing new here for this mood. You've seen the lot." } }));
    vi.stubGlobal("fetch", fetch);
    params = new URLSearchParams("mood=romance");
    render(<NewPicks initial={{ picks, notices: {}, mood: "" }} shelves={[anime, films]} />);
    expect(await screen.findByText("That's a lot of switching. Give it a few seconds.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Nothing new here for this mood. You've seen the lot.")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
