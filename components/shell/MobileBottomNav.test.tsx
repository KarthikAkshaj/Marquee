import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/home";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const add = vi.fn();
vi.mock("@/components/palette/PaletteProvider", () => ({ usePalette: () => ({ add }) }));
vi.mock("@/lib/actions/auth", () => ({ signOut: vi.fn(), switchAccount: vi.fn() }));

const { MobileBottomNav } = await import("./MobileBottomNav");

const shelf = (name: string, itemCount: number) => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  kind: "anime" as const,
  color: "crimson",
  icon: "sparkles",
  position: 0,
  itemCount,
});
const user = { displayName: "Flux", username: "void_flux", email: "flux@example.com", avatarUrl: null };

function setup(path: string) {
  pathname = path;
  render(<MobileBottomNav categories={[shelf("Anime", 155), shelf("Games", 42)]} user={user} />);
}

describe("MobileBottomNav", () => {
  beforeEach(() => add.mockReset());
  afterEach(cleanup);

  it("marks where you are and adds with the + button", () => {
    setup("/home");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Search or add a title" }));
    expect(add).toHaveBeenCalledOnce();
  });

  it("opens the shelves as a sheet, with counts, a new shelf and Import", async () => {
    setup("/c/anime");
    expect(screen.getByRole("button", { name: "Add a title to this shelf" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Categories" }));
    const sheet = await screen.findByRole("dialog", { name: "Lists" });
    expect(within(sheet).getByRole("link", { name: /Anime\s*155/ })).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: "New category" })).toHaveAttribute("href", "/settings/categories?new=1");
    expect(within(sheet).getByRole("link", { name: "Import a list" })).toHaveAttribute("href", "/import");

    fireEvent.click(within(sheet).getByRole("link", { name: /Games/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens the account menu as a sheet", async () => {
    setup("/settings/profile");
    fireEvent.click(screen.getByRole("button", { name: "You" }));
    const sheet = await screen.findByRole("dialog", { name: "Account" });
    expect(within(sheet).getByText("@void_flux")).toBeInTheDocument();
    for (const name of ["Profile", "Settings"]) expect(within(sheet).getByRole("link", { name })).toBeInTheDocument();
    for (const name of ["Switch account", "Sign out"]) expect(within(sheet).getByRole("button", { name })).toBeInTheDocument();
    const legal = within(sheet).getByRole("navigation", { name: "Legal" });
    expect(within(legal).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(within(legal).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });

  it("steps aside on pages with their own bar along the bottom", () => {
    for (const path of ["/c/anime/match", "/import"]) {
      setup(path);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      cleanup();
    }
  });
});
