import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResult, SeriesTitle } from "@/lib/search/types";
import type { SaveMatchesInput } from "@/lib/validators";

const saveMatches = vi.fn();
vi.mock("@/lib/actions/match", () => ({ saveMatches: (input: SaveMatchesInput) => saveMatches(input) }));
const setItemAccents = vi.fn();
vi.mock("@/lib/actions/items", () => ({ setItemAccents: (colors: unknown) => setItemAccents(colors) }));
vi.mock("@/lib/image/accent-color", () => ({ accentFromCover: async () => "#aa3344" }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { MatchFlow } = await import("./MatchFlow");

const shelf = { id: "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d", name: "Anime", slug: "anime", color: "crimson", kind: "anime" as const };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const items = [
  { id: id(1), title: "Naruto", year: null, status: "completed" as const },
  { id: id(2), title: "Demon Slayer", year: null, status: "planned" as const },
  { id: id(3), title: "Hells Paradise", year: null, status: "planned" as const },
];
const anime = (externalId: string, title: string): SearchResult => ({ source: "anilist", externalId, title, coverUrl: `https://img/${externalId}.jpg` });
const naruto = anime("20", "Naruto");
const onigiri = anime("99", "Onigiri");
const hells = anime("128893", "Hell's Paradise");
const season = (externalId: string, title: string, release: SeriesTitle["release"] = "out"): SeriesTitle => ({ ...anime(externalId, title), release });
const narutoSeries = [{ ...naruto, release: "out" as const }, season("1735", "Naruto: Shippuden"), season("165523", "Boruto Part 2", "upcoming")];

const fetchMock = vi.fn();
const reply = (body: unknown) => ({ json: async () => body });

function rowFor(title: string) {
  return screen.getByLabelText(`Update ${title}`).closest("li") as HTMLElement;
}

describe("MatchFlow", () => {
  beforeEach(() => {
    saveMatches.mockReset();
    setItemAccents.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("related=")) return reply({ results: narutoSeries });
      return url.startsWith("/api/search?") ? reply({ results: [hells] }) : reply({ results: [[naruto], [onigiri], []] });
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("ticks close matches, asks about doubtful ones and offers a new search when nothing turns up", async () => {
    render(<MatchFlow shelf={shelf} items={items} taken={[]} />);
    await waitFor(() => expect(screen.getByText("1 to update")).toBeInTheDocument());
    expect(screen.getByText("1 to check")).toBeInTheDocument();
    expect(screen.getByText("1 not found")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ kind: "anime", queries: ["Naruto", "Demon Slayer", "Hells Paradise"] });

    expect(screen.getByLabelText("Update Naruto")).toBeChecked();
    expect(screen.getByLabelText("Update Demon Slayer")).not.toBeChecked();
    expect(within(rowFor("Demon Slayer")).getByText("CHECK THIS")).toBeInTheDocument();
    expect(within(rowFor("Hells Paradise")).getByText("Nothing on AniList by that name.")).toBeInTheDocument();

    fireEvent.change(within(rowFor("Hells Paradise")).getByRole("textbox"), { target: { value: "Hell's Paradise" } });
    fireEvent.click(within(rowFor("Hells Paradise")).getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByLabelText("Update Hells Paradise")).toBeChecked());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/search?kind=anime&q=Hell%27s+Paradise");
    expect(screen.getByRole("button", { name: "Update 2 titles" })).toBeEnabled();
  });

  it("saves the ticked matches and keeps the rest on screen", async () => {
    saveMatches.mockImplementation(async (input: SaveMatchesInput) => ({
      ok: true,
      saved: input.matches.map((match) => match.itemId),
      taken: [],
      failed: [],
      added: 0,
      missed: 0,
    }));
    render(<MatchFlow shelf={shelf} items={items} taken={[]} />);
    await waitFor(() => expect(screen.getByText("1 to update")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Keep my titles"));
    fireEvent.click(screen.getByRole("button", { name: "Update 1 title" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Updated 1 title."));
    expect(saveMatches).toHaveBeenCalledWith({ categoryId: shelf.id, keepTitles: true, matches: [{ itemId: id(1), result: naruto, extras: [] }] });
    expect(screen.queryByLabelText("Update Naruto")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Update Demon Slayer")).toBeInTheDocument();
    await waitFor(() => expect(setItemAccents).toHaveBeenCalledWith([{ id: id(1), color: "#aa3344" }]));
  });

  it("adds other seasons picked from the series, each with its own status", async () => {
    saveMatches.mockResolvedValue({ ok: true, saved: [id(1)], taken: [], failed: [], added: 1, missed: 0 });
    render(<MatchFlow shelf={shelf} items={items} taken={[{ key: "anilist:165523", title: "Boruto Part 2" }]} />);
    await waitFor(() => expect(screen.getByText("1 to update")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Change the match for Naruto/ }));
    const picker = await screen.findByRole("dialog", { name: "Naruto" });
    await within(picker).findByText("Naruto: Shippuden");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/search?kind=anime&related=20");
    expect(within(picker).getByText("Your match")).toBeInTheDocument();
    expect(within(picker).getByText("On your shelf as “Boruto Part 2”")).toBeInTheDocument();

    fireEvent.click(within(picker).getByLabelText("Add Naruto: Shippuden"));
    expect(within(picker).getByText("Completed")).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole("button", { name: "Next status for Naruto: Shippuden" }));
    expect(within(picker).getByText("Dropped")).toBeInTheDocument();
    expect(within(picker).getByText("+1 more to add")).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole("button", { name: "Done" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(rowFor("Naruto")).getByText("+1 more from the series")).toBeInTheDocument();
    expect(screen.getByText("+1 to add")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Update 1 title" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Updated 1 title and added 1 more."));
    expect(saveMatches.mock.calls[0][0].matches[0].extras).toEqual([{ result: narutoSeries[1], status: "dropped" }]);
  });

  it("won't put the same title on the shelf twice", async () => {
    render(<MatchFlow shelf={shelf} items={items} taken={[{ key: "anilist:20", title: "Naruto (2002)" }]} />);
    await waitFor(() => expect(screen.getByText("0 to update")).toBeInTheDocument());
    expect(within(rowFor("Naruto")).getByText("Already on this shelf as “Naruto (2002)”")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update 0 titles" })).toBeDisabled();
  });

  it("says so when there's nothing to match", () => {
    render(<MatchFlow shelf={shelf} items={[]} taken={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to match");
    expect(screen.getByRole("link", { name: "Back to Anime" })).toHaveAttribute("href", "/c/anime");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
