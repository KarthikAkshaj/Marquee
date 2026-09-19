import JSZip from "jszip";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseImport } from "./parse";
import { defaultList, readImportFile, type ImportList } from "./read-file";

const file = (parts: (string | Uint8Array)[], name: string) => new File(parts.map((part) => (typeof part === "string" ? part : new Uint8Array(part))), name);

async function lists(input: File): Promise<ImportList[]> {
  const result = await readImportFile(input);
  if (!result.ok) throw new Error(result.message);
  return result.lists;
}

const parsed = (text: string) => parseImport(text).titles.map(({ title, status }) => [title, status]);

async function zipOf(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  return zip.generateAsync({ type: "uint8array" });
}

describe("readImportFile", () => {
  it("points unreadable files somewhere useful", async () => {
    const message = async (name: string) => {
      const result = await readImportFile(file(["x"], name));
      return result.ok ? null : result.message;
    };
    expect(await message("list.doc")).toMatch(/Save As \.docx/);
    expect(await message("list.xls")).toMatch(/\.xlsx or \.csv/);
    expect(await message("list.pdf")).toMatch(/paste it instead/);
    expect(await message("list.PNG")).toMatch(/picture/);
    expect(await message("list.exe")).toMatch(/can't be read/);
    expect(await message("empty.txt")).toBe(null);
    expect(await message("blank.csv")).toBe(null);
    const blank = await readImportFile(file(["\n\n"], "blank.txt"));
    expect(blank).toEqual({ ok: false, message: "Couldn't find any titles in that file." });
  });

  it("refuses text over 5 MB but lets a zip go to 20 MB", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    expect(await readImportFile(file([big], "big.txt"))).toMatchObject({ ok: false, message: expect.stringMatching(/over 5 MB/) });
    expect(await readImportFile(file([big], "big.zip"))).toMatchObject({ ok: false, message: expect.stringMatching(/damaged/) });
  });

  it("decodes UTF-16 (Excel's Unicode Text) and Windows-1252 (older Excel CSVs)", async () => {
    const utf16 = new Uint8Array([0xff, 0xfe, ...Array.from("Amélie\n鬼滅の刃").flatMap((char) => [char.charCodeAt(0) & 0xff, char.charCodeAt(0) >> 8])]);
    expect(parsed((await lists(file([utf16], "list.txt")))[0].text)).toEqual([
      ["Amélie", null],
      ["鬼滅の刃", null],
    ]);
    const latin = new Uint8Array([...Array.from("Title\nAm").map((char) => char.charCodeAt(0)), 0xe9, ...Array.from("lie").map((char) => char.charCodeAt(0))]);
    expect(parsed((await lists(file([latin], "list.csv")))[0].text)).toEqual([["Amélie", null]]);
  });

  it("gives a file named for a status that status (watched.csv)", async () => {
    const [list] = await lists(file(["Name,Year\nDune,2021\nHeat,1995 \n"], "watched.csv"));
    expect(list).toMatchObject({ name: "watched.csv", count: 2, kind: null });
    expect(parsed(list.text)).toEqual([
      ["Dune", "completed"],
      ["Heat", "completed"],
    ]);
  });

  it("reads each list in a zip, biggest first, skipping junk and Notion's duplicate", async () => {
    const zip = await zipOf({
      "watchlist.csv": "Date,Name,Year\n2024-01-01,Arrival,2016\n",
      "diary.csv": "Date,Name,Year,Watched Date\n2024-01-02,Dune,2021,2024-01-01\n2024-01-03,Heat,1995,2024-01-02\n",
      "Export-9f/Films 0123456789abcdef0123456789abcdef.csv": "Name,Status\nRan,Watched\nPerfect Days,\nMonster,\n",
      "Export-9f/Films 0123456789abcdef0123456789abcdef_all.csv": "Name,Status\nRan,Watched\nPerfect Days,\nMonster,\n",
      "profile.csv": "Date Joined,Username,Given Name\n2020-01-01,someone,Some\n",
      "__MACOSX/._diary.csv": "junk",
      "poster.png": "not text",
    });
    const found = await lists(file([zip], "letterboxd.zip"));
    expect(found.map((list) => [list.name, list.count])).toEqual([
      ["Films.csv", 3],
      ["diary.csv", 2],
      ["watchlist.csv", 1],
    ]);
    expect(parsed(found[1].text)).toEqual([
      ["Dune", "completed"],
      ["Heat", "completed"],
    ]);
    expect(parsed(found[2].text)).toEqual([["Arrival", "planned"]]);
  });

  it("says so when a zip has nothing readable, or isn't a zip", async () => {
    const images = await zipOf({ "a.png": "x" });
    expect(await readImportFile(file([images], "pics.zip"))).toMatchObject({ ok: false, message: expect.stringMatching(/Nothing in that zip/) });
    expect(await readImportFile(file(["not a zip"], "broken.zip"))).toMatchObject({ ok: false, message: expect.stringMatching(/damaged/) });
  });

  it("reads every sheet of an .xlsx, with shared and inline strings and date years", async () => {
    const zip = new JSZip();
    zip.file(
      "xl/workbook.xml",
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets><sheet name="Anime" sheetId="1" r:id="rId1"/><sheet name="Watchlist" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>`,
    );
    zip.file(
      "xl/sharedStrings.xml",
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <si><t>Title</t></si><si><t>Status</t></si><si><r><t>鬼滅の</t></r><r><t>刃</t></r><rPh><t>きめつのやいば</t></rPh></si><si><t>Watching</t></si></sst>`,
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>Released</t></is></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2" t="s"><v>3</v></c><c r="D2"><v>43466</v></c></row>
      </sheetData></worksheet>`,
    );
    zip.file(
      "xl/worksheets/sheet2.xml",
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>Pluto</t></is></c></row></sheetData></worksheet>`,
    );
    const found = await lists(file([await zip.generateAsync({ type: "uint8array" })], "lists.xlsx"));
    expect(found.map((list) => list.name)).toEqual(["Anime", "Watchlist"]);
    expect(parseImport(found[0].text).titles.map(({ title, status, year }) => [title, status, year])).toEqual([["鬼滅の刃", "in_progress", 2019]]);
    expect(parsed(found[1].text)).toEqual([["Pluto", "planned"]]);
  });

  it("unpacks a gzipped MyAnimeList export", async () => {
    const xml = "<myanimelist><anime><series_title><![CDATA[Monster]]></series_title><my_status>Completed</my_status></anime></myanimelist>";
    const [list] = await lists(file([gzipSync(xml)], "animelist_1_-_2.xml.gz"));
    expect(parsed(list.text)).toEqual([["Monster", "completed"]]);
  });

  it("tells a random XML file apart from a MyAnimeList export", async () => {
    expect(await readImportFile(file(["<rss></rss>"], "feed.xml"))).toMatchObject({ ok: false, message: expect.stringMatching(/MyAnimeList/) });
  });
});

describe("defaultList", () => {
  const list = (name: string, count: number, kind: ImportList["kind"] = null): ImportList => ({ name, text: "", count, kind });

  it("starts on the list named like the shelf, then one of its kind, then the longest", () => {
    const lists = [list("Movies", 2, "movie"), list("Shows", 9, "series"), list("anime ", 1, "anime")];
    expect(defaultList(lists, { name: "Anime", kind: "anime" })).toBe(2);
    expect(defaultList(lists, { name: "Films", kind: "movie" })).toBe(0);
    expect(defaultList(lists, { name: "Games", kind: "game" })).toBe(1);
  });
});
