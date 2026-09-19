import { describe, expect, it } from "vitest";
import { parseImport } from "@/lib/import/parse";
import { markdownToText } from "./markdown";

const parsed = (markdown: string) => parseImport(markdownToText(markdown)).titles.map(({ title, status, year }) => [title, status, year]);

describe("markdownToText", () => {
  it("reads a Notion page: title heading, to-dos, headed sections and inline marks", () => {
    const markdown = [
      "---",
      "tags: anime",
      "---",
      "# My anime",
      "",
      "- [x] **Frieren** (2023)",
      "- [ ] [Pluto](https://www.notion.so/pluto-1a2b)",
      "",
      "## Watching",
      "",
      "* _Vinland Saga_",
      "1. `Dandadan`",
      "",
      "---",
      "https://myanimelist.net/anime/1",
      "![poster](poster.png)",
      "<aside>Monster</aside>",
      "\\[Oshi no Ko\\]",
    ].join("\n");
    expect(parsed(markdown)).toEqual([
      ["Frieren", "completed", 2023],
      ["Pluto", null, null],
      ["Vinland Saga", "in_progress", null],
      ["Dandadan", "in_progress", null],
      ["Monster", "in_progress", null],
      ["[Oshi no Ko]", "in_progress", null],
    ]);
  });

  it("reads a table through its header row", () => {
    const markdown = ["| Name | Status | Year |", "| --- | :---: | ---: |", "| **Dune** | Watched | 2021 |", "| Arrival | Watchlist | |"].join("\n");
    expect(parsed(markdown)).toEqual([
      ["Dune", "completed", 2021],
      ["Arrival", "planned", null],
    ]);
  });
});
