import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicTitle, ShelfAccess, ViewerShelf } from "@/lib/public-profile";

const copySharedTitles = vi.fn();
const undoCopies = vi.fn();
vi.mock("@/lib/actions/shared", () => ({
  copySharedTitles: (...args: unknown[]) => copySharedTitles(...args),
  undoCopies: (...args: unknown[]) => undoCopies(...args),
}));
const success = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...args: unknown[]) => success(...args), error: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { AddAllButton } = await import("./AddAllButton");

const title = (n: number): PublicTitle => ({
  id: `t${n}`,
  title: `Title ${n}`,
  status: "completed",
  rating: null,
  progress_current: 0,
  progress_total: null,
  cover_url: null,
  backdrop_url: null,
  accent_color: null,
  year: 2020,
  format: "tv",
  genres: [],
  is_favorite: false,
});

const anime: ViewerShelf = { id: "s1", name: "Anime", slug: "anime", kind: "anime", color: "crimson" };
const access: ShelfAccess = { by: "link", token: "abcdefghijklmnopqrstuv" };
const base = {
  access,
  kind: "anime" as const,
  tab: "all" as const,
  signInHref: null,
  shelves: [anime],
  from: "Flux's Anime",
  onAdded: vi.fn(),
  onUndone: vi.fn(),
};

describe("AddAllButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("sends a signed-out visitor to sign in first", () => {
    render(<AddAllButton {...base} shown={[title(1), title(2), title(3)]} copies={{}} signInHref="/login?next=%2Fs%2Fabc" />);
    expect(screen.getByRole("link", { name: "Add all 3" }).getAttribute("href")).toBe("/login?next=%2Fs%2Fabc");
  });

  it("says so when everything on the tab is yours already", () => {
    render(<AddAllButton {...base} tab="completed" shown={[title(1)]} copies={{ t1: { item: "i1", shelf: "s1" } }} />);
    expect(screen.getByText("These are all on your shelves")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("adds what you don't have, and Undo takes it back", async () => {
    copySharedTitles.mockResolvedValue({ ok: true, added: [{ shared: "t2", item: "n2" }, { shared: "t3", item: "n3" }], already: 0 });
    undoCopies.mockResolvedValue({ ok: true });
    render(<AddAllButton {...base} shown={[title(1), title(2), title(3)]} copies={{ t1: { item: "i1", shelf: "s1" } }} />);

    fireEvent.click(screen.getByRole("button", { name: "Add all 2" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/1 title you have already is skipped/)).toBeTruthy();
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Add to Anime" })));

    expect(copySharedTitles).toHaveBeenCalledWith({ access, itemIds: ["t2", "t3"], categoryId: "s1", status: "planned" });
    expect(base.onAdded).toHaveBeenCalledWith({ t2: { item: "n2", shelf: "s1" }, t3: { item: "n3", shelf: "s1" } });
    const [message, options] = success.mock.calls[0] as [string, { action: { onClick: () => void } }];
    expect(message).toBe("Added 2 titles to your Anime.");

    await act(async () => options.action.onClick());
    expect(undoCopies).toHaveBeenCalledWith(["n2", "n3"]);
    await waitFor(() => expect(base.onUndone).toHaveBeenCalledWith(["t2", "t3"]));
  });

  it("goes in batches of 500 on a big shelf", async () => {
    copySharedTitles.mockImplementation(async ({ itemIds }: { itemIds: string[] }) => ({
      ok: true,
      added: itemIds.map((id) => ({ shared: id, item: `n-${id}` })),
      already: 0,
    }));
    const shown = Array.from({ length: 501 }, (_, n) => title(n));
    render(<AddAllButton {...base} shown={shown} copies={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Add all 501" }));
    await act(async () => fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Add to Anime" })));
    expect(copySharedTitles.mock.calls.map(([input]) => (input as { itemIds: string[] }).itemIds.length)).toEqual([500, 1]);
    expect(success.mock.calls[0]?.[0]).toBe("Added 501 titles to your Anime.");
  });
});
