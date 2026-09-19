import { tableToText } from "./table";

const BLOCKS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DETAILS", "DIV", "DL", "DT", "FIGCAPTION", "FIGURE",
  "FOOTER", "HEADER", "HR", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "SUMMARY", "UL",
]);
const SKIP = new Set(["BUTTON", "HEAD", "IFRAME", "IMG", "NOSCRIPT", "OBJECT", "SCRIPT", "SELECT", "STYLE", "SVG", "TEMPLATE", "TEXTAREA", "TITLE"]);
const CHECKED = ":scope > input[type=checkbox][checked], :scope > .checkbox-on, :scope > .to-do-children-checked";

const squash = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

function tableRows(table: HTMLTableElement): string[][] {
  return Array.from(table.rows, (row) => Array.from(row.cells, (cell) => squash(cell.textContent)));
}

/**
 * An HTML page (a Notion or Google Docs export) as lines for the paste box.
 * DOMParser builds an inert document: no scripts run and nothing loads.
 * List items keep a bullet (and [x] when ticked), headings become section
 * headers, and tables go through their header row.
 */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: string[] = [];
  let line = "";
  // A list item's bullet waits for the item's first text, even inside a <p>.
  let bullet = "";
  const flush = (suffix = "") => {
    const text = squash(line);
    if (text) {
      lines.push(`${bullet}${text}${suffix}`);
      bullet = "";
    }
    line = "";
  };

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      line += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    const tag = element.tagName.toUpperCase();
    if (SKIP.has(tag)) return;
    if (tag === "BR") return flush();
    if (tag === "TABLE") {
      flush();
      lines.push(tableToText(tableRows(element as HTMLTableElement)));
      return;
    }
    if (/^H[1-6]$/.test(tag)) {
      flush();
      line = squash(element.textContent).replace(/:$/, "");
      return flush(":");
    }
    if (tag === "LI") {
      flush();
      bullet = element.querySelector(CHECKED) ? "[x] " : "- ";
      element.childNodes.forEach(walk);
      flush();
      bullet = "";
      return;
    }
    // An empty block (Notion's checkbox <div>) doesn't break the line.
    const block = BLOCKS.has(tag) && squash(element.textContent) !== "";
    if (block) flush();
    element.childNodes.forEach(walk);
    if (block) flush();
  }

  walk(doc.body);
  flush();
  return lines.join("\n");
}
