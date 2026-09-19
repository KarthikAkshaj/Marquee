import { describe, expect, it } from "vitest";
import { parseImport } from "@/lib/import/parse";
import { htmlToText } from "./html";

const parsed = (html: string) => parseImport(htmlToText(html)).titles.map(({ title, status, year }) => [title, status, year]);

describe("htmlToText", () => {
  it("reads a Notion export: page title, ticked to-dos, headed lists", () => {
    const html = `<!doctype html><html><head><title>Anime</title><style>li { color: red }</style></head><body>
      <h1 class="page-title">Anime</h1>
      <ul class="to-do-list"><li><div class="checkbox checkbox-on"></div> <span class="to-do-children-checked">Frieren</span></li></ul>
      <ul class="to-do-list"><li><div class="checkbox checkbox-off"></div> <span>Pluto</span></li></ul>
      <h2>Dropped</h2>
      <ul><li><p><span>Tokyo Ghoul</span></p></li><li>Gantz<br>(2004)</li></ul>
      <script>document.title = "never runs"</script>
    </body></html>`;
    expect(parsed(html)).toEqual([
      ["Frieren", "completed", null],
      ["Pluto", null, null],
      ["Tokyo Ghoul", "dropped", null],
      ["Gantz", "dropped", null],
    ]);
  });

  it("reads a table through its header row and a Google Docs paragraph list", () => {
    const html = `<table><thead><tr><th><svg></svg>Name</th><th>Status</th></tr></thead>
      <tbody><tr><td>Dune</td><td>Watched</td></tr><tr><td>Arrival</td><td></td></tr></tbody></table>
      <p><span>Heat</span></p><p><span style="font-weight:700">Ran (1985)</span></p>`;
    expect(parsed(html)).toEqual([
      ["Dune", "completed", null],
      ["Arrival", null, null],
      ["Heat", null, null],
      ["Ran", null, 1985],
    ]);
  });
});
