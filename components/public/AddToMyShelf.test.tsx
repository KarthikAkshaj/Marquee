import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicTitle, ViewerShelf } from "@/lib/public-profile";

const addSharedTitle = vi.fn();
vi.mock("@/lib/actions/shared", () => ({ addSharedTitle: (...args: unknown[]) => addSharedTitle(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { AddToMyShelf } = await import("./AddToMyShelf");
const { toast } = await import("sonner");

const frieren: PublicTitle = {
  id: "t1",
  title: "Frieren",
  status: "completed",
  rating: 10,
  progress_current: 28,
  progress_total: 28,
  cover_url: null,
  backdrop_url: null,
  accent_color: null,
  year: 2023,
  format: "tv",
  genres: ["Fantasy"],
  is_favorite: true,
};

const anime: ViewerShelf = { id: "s1", name: "Anime", slug: "anime", kind: "anime", color: "crimson" };
const donghua: ViewerShelf = { id: "s2", name: "Donghua", slug: "donghua", kind: "anime", color: "teal" };

const base = { title: frieren, username: "flux", kind: "anime" as const, signInHref: null, copy: null, onAdded: vi.fn() };

describe("AddToMyShelf", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("asks a signed-out visitor to sign in, coming back to this card", () => {
    render(<AddToMyShelf {...base} signInHref="/login?next=%2Fu%2Fflux%3Fitem%3Dt1" shelves={[]} />);
    expect(screen.getByRole("link", { name: "Sign in to add it" }).getAttribute("href")).toBe("/login?next=%2Fu%2Fflux%3Fitem%3Dt1");
  });

  it("says where your copy is instead of offering another", () => {
    render(<AddToMyShelf {...base} shelves={[anime]} copy={{ item: "i9", shelf: "s1" }} />);
    expect(screen.getByText("On your Anime shelf")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open/ }).getAttribute("href")).toBe("/c/anime?item=i9");
    expect(screen.queryByRole("button", { name: /Add to/ })).toBeNull();
  });

  it("points to making a shelf when none of yours takes this kind", () => {
    render(<AddToMyShelf {...base} kind="game" shelves={[]} />);
    expect(screen.getByText("No shelf of yours takes Game titles yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Make one" }).getAttribute("href")).toBe("/settings/categories");
  });

  it("adds it as planned to your only shelf of that kind, then says so", async () => {
    addSharedTitle.mockResolvedValue({ ok: true, id: "new-id" });
    render(<AddToMyShelf {...base} shelves={[anime]} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Add to Anime" })));
    expect(addSharedTitle).toHaveBeenCalledWith({ username: "flux", itemId: "t1", categoryId: "s1", status: "planned" });
    expect(base.onAdded).toHaveBeenCalledWith({ item: "new-id", shelf: "s1" });
    expect(toast.success).toHaveBeenCalledWith("Added Frieren to your Anime.", expect.anything());
  });

  it("lets you pick the shelf and the status", async () => {
    addSharedTitle.mockResolvedValue({ ok: true, id: "new-id" });
    render(<AddToMyShelf {...base} shelves={[anime, donghua]} />);
    fireEvent.click(screen.getByRole("radio", { name: "Donghua" }));
    fireEvent.click(screen.getByRole("button", { name: "Next status" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Add to Donghua" })));
    expect(addSharedTitle).toHaveBeenCalledWith({ username: "flux", itemId: "t1", categoryId: "s2", status: "in_progress" });
  });

  it("keeps the offer open and says why when the add fails", async () => {
    addSharedTitle.mockResolvedValue({ ok: false, message: "That title isn't shared anymore." });
    render(<AddToMyShelf {...base} shelves={[anime]} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Add to Anime" })));
    expect(toast.error).toHaveBeenCalledWith("That title isn't shared anymore.");
    expect(base.onAdded).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add to Anime" })).toBeTruthy();
  });
});
