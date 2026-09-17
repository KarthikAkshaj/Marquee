import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/queries";

const checkUsername = vi.fn();
const updateProfile = vi.fn();

vi.mock("@/lib/actions/profile", () => ({
  checkUsername: (...args: unknown[]) => checkUsername(...args),
  updateProfile: (...args: unknown[]) => updateProfile(...args),
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { ProfileForm } = await import("./ProfileForm");

const profile: Profile = {
  username: "akuma_3f9c",
  display_name: "Akuma",
  avatar_url: null,
  bio: null,
  created_at: "2024-03-02T10:00:00Z",
  email: "akuma@example.com",
  stats: { memberSince: "2024-03", totalTitles: 431, completedThisYear: 87 },
};

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    checkUsername.mockReset();
    updateProfile.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the save bar only once something changes, and Discard puts it back", () => {
    render(<ProfileForm profile={profile} />);
    expect(screen.queryByRole("region", { name: "Unsaved changes" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Akuma the Great" } });
    expect(screen.getByRole("region", { name: "Unsaved changes" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByLabelText("Display name")).toHaveValue("Akuma");
  });

  it("checks a new username after a pause, offers a free alternative when taken, and won't save until it's sorted", async () => {
    checkUsername.mockResolvedValueOnce({ status: "taken", suggestion: "akuma_42" });
    render(<ProfileForm profile={profile} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "Akuma" } });
    expect(screen.getByLabelText("Username")).toHaveValue("akuma");
    expect(screen.getByText("checking…")).toBeInTheDocument();
    expect(checkUsername).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(450));
    expect(checkUsername).toHaveBeenCalledWith("akuma");
    expect(await screen.findByText("taken")).toBeInTheDocument();
    expect(screen.getByText(/Someone got there first/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    checkUsername.mockResolvedValueOnce({ status: "available" });
    fireEvent.click(screen.getByRole("button", { name: "akuma_42" }));
    await act(() => vi.advanceTimersByTimeAsync(450));
    expect(await screen.findByText("available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("explains the username rules without asking the server", () => {
    render(<ProfileForm profile={profile} />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "ab" } });
    vi.advanceTimersByTime(1000);
    expect(checkUsername).not.toHaveBeenCalled();
    expect(screen.getByText("3–20 characters: lowercase letters, numbers and _.")).toBeInTheDocument();
  });

  it("saves tidied values and counts down the bio", async () => {
    updateProfile.mockResolvedValue({ ok: true });
    render(<ProfileForm profile={profile} />);

    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "  Frieren apologist.  " } });
    expect(screen.getByText(String(160 - "  Frieren apologist.  ".length))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ display_name: "Akuma", username: "akuma_3f9c", bio: "Frieren apologist." }),
    );
  });

  it("shows the stats card", () => {
    render(<ProfileForm profile={profile} />);
    expect(screen.getByText("2024-03")).toBeInTheDocument();
    expect(screen.getByText("431")).toBeInTheDocument();
    expect(screen.getByText("087")).toBeInTheDocument();
  });
});
