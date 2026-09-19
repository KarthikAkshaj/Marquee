import { tableToText } from "./table";

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/;
const TABLE_RULE = /^\|?[\s:|-]*-[\s:|-]*\|?$/;
const HORIZONTAL_RULE = /^([-*_])(\s*\1){2,}$/;
const URL_ONLY = /^<?https?:\/\/\S+>?$/;

/** Inline Markdown down to its words: links keep their text, images and stray HTML go. */
function inline(text: string): string {
  if (URL_ONLY.test(text)) return "";
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, "$2")
    .replace(/(?<![\w*\\])\*(?=\S)(.+?)(?<=\S)\*(?![\w*])/g, "$1")
    .replace(/(?<![\w\\])_(?=\S)(.+?)(?<=\S)_(?!\w)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!|~<>])/g, "$1")
    .trim();
}

function tableCells(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map(inline);
}

/**
 * A Markdown file (Notion, Obsidian, a Google Docs download) as lines for the
 * paste box. Lists and checkboxes pass through for the parser; headings become
 * section headers ("## Watched" → "Watched:"); tables go through their header row.
 */
export function markdownToText(markdown: string): string {
  const lines: string[] = [];
  let table: string[][] = [];
  const flushTable = () => {
    if (table.length) lines.push(tableToText(table));
    table = [];
  };

  for (const raw of markdown.replace(FRONT_MATTER, "").split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (line.startsWith("|")) {
      if (!TABLE_RULE.test(line)) table.push(tableCells(line));
      continue;
    }
    flushTable();
    if (/^(```|~~~)/.test(line) || HORIZONTAL_RULE.test(line)) continue;
    const heading = line.match(/^#{1,6}\s+(.*?)\s*#*$/);
    if (heading) {
      const text = inline(heading[1]).replace(/:$/, "");
      if (text) lines.push(`${text}:`);
      continue;
    }
    lines.push(inline(line));
  }
  flushTable();
  return lines.join("\n");
}
