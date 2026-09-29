import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const setProfilePublic = vi.fn();
const setShelfPublic = vi.fn();
vi.mock("@/lib/actions/profile", () => ({
  setProfilePublic: (on: boolean) => setProfilePublic(on),
  setShelfPublic: (id: string, on: boolean) => setShelfPublic(id, on),
}));
const createShelfLink = vi.fn();
const removeShelfLink = vi.fn();
vi.mock("@/lib/actions/links", () => ({
  createShelfLink: (id: string) => createShelfLink(id),
  renewShelfLink: vi.fn(),
  removeShelfLink: (id: string) => removeShelfLink(id),
}));
const error = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (message: string) => error(message), success: vi.fn() } }));

const { SharingCard } = await import("./SharingCard");

const TOKEN = "abcdefghijklmnopqrstuv";
const shelves = [
  { id: "s1", name: "Anime", slug: "anime", color: "violet", icon: "sparkles", is_public: false, itemCount: 120, linkToken: null },
  { id: "s2", name: "Movies", slug: "movies", color: "amber", icon: "clapperboard", is_public: true, itemCount: 42, linkToken: TOKEN },
];

function setup(isPublic = false) {
  render(<SharingCard username="akshaj" isPublic={isPublic} shelves={shelves} link="https://marquee.test/u/akshaj" />);
}

describe("SharingCard", () => {
  afterEach(() => {
    cleanup();
    setProfilePublic.mockReset();
    setShelfPublic.mockReset();
    error.mockReset();
  });

  it("starts from what's saved", () => {
    setup();
    expect(screen.getByRole("switch", { name: "Public profile" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: /Anime/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: /Movies/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("button", { name: /Copy link/ })).toBeNull();
  });

  it("turns the profile on at once and shows the link to share", async () => {
    setProfilePublic.mockResolvedValue({ ok: true });
    setup();
    fireEvent.click(screen.getByRole("switch", { name: "Public profile" }));
    expect(screen.getByRole("switch", { name: "Public profile" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("https://marquee.test/u/akshaj")).toBeInTheDocument();
    await waitFor(() => expect(setProfilePublic).toHaveBeenCalledWith(true));
  });

  it("flips a shelf, and flips it back with a word when the save fails", async () => {
    setShelfPublic.mockResolvedValue({ ok: false, message: "Couldn't change that. Try again." });
    setup(true);
    const anime = screen.getByRole("switch", { name: /Anime/ });
    fireEvent.click(anime);
    await waitFor(() => expect(setShelfPublic).toHaveBeenCalledWith("s1", true));
    await waitFor(() => expect(anime).toHaveAttribute("aria-checked", "false"));
    expect(error).toHaveBeenCalledWith("Couldn't change that. Try again.");
  });

  it("keeps shelf picks while the profile is off, and says so", () => {
    setup(false);
    expect(screen.getByText(/Your picks are kept. They show again when the profile is on./)).toBeInTheDocument();
  });

  it("shows which shelves are shared by link, with the profile off too", () => {
    setup(false);
    expect(screen.getByRole("button", { name: "Share by link: Anime" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Link on: Movies" })).toBeEnabled();
  });

  it("makes a shelf's link from its row", async () => {
    createShelfLink.mockResolvedValue({ ok: true, token: TOKEN });
    setup(false);
    fireEvent.click(screen.getByRole("button", { name: "Share by link: Anime" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create link" }));
    await waitFor(() => expect(createShelfLink).toHaveBeenCalledWith("s1"));
    expect(await screen.findByText(new RegExp(`/s/${TOKEN}$`))).toBeInTheDocument();
  });

  it("asks before turning a link off", async () => {
    removeShelfLink.mockResolvedValue({ ok: true, token: null });
    setup(false);
    fireEvent.click(screen.getByRole("button", { name: "Link on: Movies" }));
    fireEvent.click(await screen.findByRole("button", { name: "Turn off" }));
    expect(removeShelfLink).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Turn off" }));
    await waitFor(() => expect(removeShelfLink).toHaveBeenCalledWith("s2"));
  });
});
