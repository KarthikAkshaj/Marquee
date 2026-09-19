import type JSZip from "jszip";

const RELATIONSHIPS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export type Sheet = { name: string; rows: string[][] };

async function xml(zip: JSZip, path: string): Promise<Document | null> {
  const file = zip.file(path);
  return file ? new DOMParser().parseFromString(await file.async("string"), "application/xml") : null;
}

const byName = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS("*", name));

/** A shared string's text, leaving out the phonetic reading Japanese Excel adds (<rPh>). */
function stringText(item: Element): string {
  return byName(item, "t")
    .filter((text) => text.parentElement?.localName !== "rPh")
    .map((text) => text.textContent ?? "")
    .join("");
}

/** "C12" → 2. */
function columnIndex(reference: string | null, fallback: number): number {
  const letters = reference?.match(/^[A-Z]+/)?.[0];
  if (!letters) return fallback;
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function cellText(cell: Element, shared: string[]): string {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") return byName(cell, "is")[0] ? stringText(byName(cell, "is")[0]) : "";
  const value = byName(cell, "v")[0]?.textContent ?? "";
  if (type === "s") return shared[Number(value)] ?? "";
  if (type === "b") return value === "1" ? "TRUE" : "FALSE";
  return value;
}

/**
 * Every sheet of an Excel or Google Sheets .xlsx as rows of cell text, in tab
 * order. Dates stay as Excel's day numbers (the year reader understands them).
 */
export async function readXlsx(zip: JSZip): Promise<Sheet[]> {
  const [workbook, rels, strings] = await Promise.all([xml(zip, "xl/workbook.xml"), xml(zip, "xl/_rels/workbook.xml.rels"), xml(zip, "xl/sharedStrings.xml")]);
  if (!workbook || !rels) return [];
  const shared = strings ? byName(strings, "si").map(stringText) : [];
  const targets = new Map(byName(rels, "Relationship").map((rel) => [rel.getAttribute("Id"), rel.getAttribute("Target") ?? ""]));

  const sheets: Sheet[] = [];
  for (const sheet of byName(workbook, "sheet")) {
    const target = targets.get(sheet.getAttributeNS(RELATIONSHIPS, "id") ?? sheet.getAttribute("r:id"));
    if (!target) continue;
    const doc = await xml(zip, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    if (!doc) continue;
    const rows = byName(doc, "row").map((row) => {
      const cells: string[] = [];
      byName(row, "c").forEach((cell, position) => {
        cells[columnIndex(cell.getAttribute("r"), position)] = cellText(cell, shared);
      });
      return Array.from(cells, (cell) => cell ?? "");
    });
    sheets.push({ name: sheet.getAttribute("name") ?? "Sheet", rows });
  }
  return sheets;
}
