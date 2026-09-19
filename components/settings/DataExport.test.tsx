import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exportData = vi.fn();
const exportCategoryCsv = vi.fn();
vi.mock("@/lib/actions/data", () => ({
  exportData: () => exportData(),
  exportCategoryCsv: (id: string) => exportCategoryCsv(id),
}));
const downloadFile = vi.fn();
vi.mock("@/lib/download", () => ({ downloadFile: (...args: unknown[]) => downloadFile(...args) }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast }));

const { DataExport } = await import("./DataExport");

const shelves = [
  { id: "a", name: "Anime", color: "crimson", itemCount: 155 },
  { id: "g", name: "Games", color: "teal", itemCount: 42 },
];

describe("DataExport", () => {
  beforeEach(() => {
    exportData.mockReset();
    exportCategoryCsv.mockReset();
    downloadFile.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
  });
  afterEach(cleanup);

  it("downloads everything as one JSON file", async () => {
    exportData.mockResolvedValue({ ok: true, data: { app: "marquee" }, fileName: "marquee-void_flux-2026-09-19.json" });
    render(<DataExport shelves={shelves} titleCount={197} />);
    expect(screen.getByText("197 titles · 2 shelves")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    await waitFor(() => expect(downloadFile).toHaveBeenCalledWith("marquee-void_flux-2026-09-19.json", expect.stringContaining('"app": "marquee"'), "application/json"));
    expect(toast.success).toHaveBeenCalledWith("Your data's downloading.");
  });

  it("downloads the chosen shelf as CSV, and says so when it can't", async () => {
    exportCategoryCsv.mockResolvedValue({ ok: true, csv: "Title\r\n", fileName: "marquee-anime-2026-09-19.csv" });
    render(<DataExport shelves={shelves} titleCount={197} />);
    expect(screen.getByRole("button", { name: "Category to export: Anime" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(downloadFile).toHaveBeenCalledWith("marquee-anime-2026-09-19.csv", "Title\r\n", "text/csv;charset=utf-8"));
    expect(exportCategoryCsv).toHaveBeenCalledWith("a");

    exportCategoryCsv.mockResolvedValue({ ok: false, message: "Your session ended. Sign in again." });
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Your session ended. Sign in again."));
  });
});
