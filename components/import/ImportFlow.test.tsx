import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportBatch } from "@/lib/validators";

const importTitles = vi.fn();
vi.mock("@/lib/actions/import", () => ({ importTitles: (batch: ImportBatch) => importTitles(batch) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { ImportFlow } = await import("./ImportFlow");

const anime = { id: "a", name: "Anime", slug: "anime", color: "crimson", kind: "anime" as const, itemCount: 3 };
const movies = { id: "m", name: "Movies", slug: "movies", color: "amber", kind: "movie" as const, itemCount: 1 };

function setup() {
  render(
    <ImportFlow
      shelves={[anime, movies]}
      saved={[{ title: "Frieren", status: "completed", category_id: "a" }]}
      initialShelfId={null}
    />,
  );
  window.scrollTo = vi.fn();
}

describe("ImportFlow", () => {
  beforeEach(() => {
    importTitles.mockReset();
  });
  afterEach(cleanup);

  it("reads the list, skips what you already have, and imports the rest in order", async () => {
    importTitles.mockImplementation(async (batch: ImportBatch) => ({ ok: true, added: batch.titles.length }));
    setup();
    fireEvent.change(screen.getByLabelText("PASTE"), {
      target: { value: "- Frieren\nVinland Saga (watching)\nTo watch:\n1. Pluto\nPluto" },
    });
    expect(screen.getByText(/headed for Anime/)).toHaveTextContent("1 repeated line dropped");
    fireEvent.click(screen.getByRole("button", { name: /Review 3 titles/ }));

    expect(screen.getByRole("heading", { name: "Check the marquee." })).toBeInTheDocument();
    expect(screen.getByText("Already in Anime · Completed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import 2 titles" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Imported 2 · skipped 1 duplicate"));
    expect(importTitles).toHaveBeenCalledTimes(1);
    const batch = importTitles.mock.calls[0][0] as ImportBatch;
    expect(batch.categoryId).toBe("a");
    expect(batch.titles).toEqual([
      { title: "Vinland Saga", status: "in_progress", year: null, position: 0 },
      { title: "Pluto", status: "planned", year: null, position: 1 },
    ]);
    expect(screen.getByRole("link", { name: "Open Anime" })).toHaveAttribute("href", "/c/anime");
  });

  it("drops a Marquee backup onto its matching shelf and lets you pick another of its lists", async () => {
    importTitles.mockImplementation(async (batch: ImportBatch) => ({ ok: true, added: batch.titles.length }));
    setup();
    const backup = {
      app: "marquee",
      version: 1,
      categories: [
        { name: "Movies", kind: "movie", items: [{ title: "Dune", status: "completed", year: 2021 }] },
        { name: "Anime", kind: "anime", items: [{ title: "Pluto", status: "in_progress", year: null }, { title: "Monster", status: "planned", year: 2004 }] },
      ],
    };
    const input = document.querySelector<HTMLInputElement>("input[type=file]");
    if (!input) throw new Error("no file input");
    fireEvent.change(input, { target: { files: [new File([JSON.stringify(backup)], "marquee-someone.json")] } });

    const picker = await screen.findByRole("button", { name: "List to import: Anime, 2 titles" });
    expect(screen.getByLabelText("PASTE")).toHaveValue("Pluto (in progress)\nMonster (2004) (planned)");

    fireEvent.keyDown(picker, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: /Movies/ }));
    expect(screen.getByLabelText("PASTE")).toHaveValue("Dune (2021) (completed)");

    fireEvent.click(screen.getByRole("button", { name: /Review 1 title/ }));
    expect(screen.getByText("marquee-someone.json · Movies")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import 1 title" }));
    await waitFor(() => expect(importTitles).toHaveBeenCalledTimes(1));
    expect((importTitles.mock.calls[0][0] as ImportBatch).titles).toEqual([{ title: "Dune", status: "completed", year: 2021, position: 0 }]);
  });

  it("uses the chosen shelf and default status, and keeps rows when a batch fails", async () => {
    importTitles.mockResolvedValue({ ok: false, message: "Couldn't import those titles. Try again." });
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Movies/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Watched" }));
    fireEvent.change(screen.getByLabelText("PASTE"), { target: { value: "Dune\nArrival" } });
    fireEvent.click(screen.getByRole("button", { name: /Review 2 titles/ }));
    fireEvent.click(screen.getByRole("button", { name: "Import 2 titles" }));

    await waitFor(() => expect(importTitles).toHaveBeenCalled());
    expect((importTitles.mock.calls[0][0] as ImportBatch).titles.map((t) => [t.title, t.status])).toEqual([
      ["Dune", "completed"],
      ["Arrival", "completed"],
    ]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Import 2 titles" })).toBeEnabled());
    expect(screen.getAllByLabelText("Title")).toHaveLength(2);
  });
});
