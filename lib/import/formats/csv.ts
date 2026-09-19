/** The delimiter used most on the first line outside quotes: comma, semicolon (European Excel) or tab. */
function sniff(text: string): string {
  const end = text.search(/\r|\n/);
  const line = (end === -1 ? text : text.slice(0, end)).replace(/"[^"]*"/g, "");
  const counts = [",", ";", "\t"].map((delimiter) => [delimiter, line.split(delimiter).length - 1] as const);
  const [best] = [...counts].sort((a, b) => b[1] - a[1]);
  return best[1] > 0 ? best[0] : ",";
}

/**
 * Rows of cells from CSV or TSV (RFC 4180): quoted cells may hold the
 * delimiter, doubled quotes and line breaks. Any line ending works.
 */
export function parseDelimited(input: string, delimiter = sniff(input)): string[][] {
  // Excel's byte-order mark, when the text didn't come through TextDecoder.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.trim() === "") {
      quoted = true;
      cell = "";
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
