/**
 * Two letters for the generated avatar (SPEC §8.10).
 * "Akuma" → "AK", "Ada Lovelace" → "AL". Counts code points, not UTF-16 units,
 * so a name starting with an accented or non-Latin letter isn't split in half.
 */
export function initials(name: string | null | undefined) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  }

  const first = Array.from(words[0])[0] ?? "";
  const second = Array.from(words[1])[0] ?? "";
  return `${first}${second}`.toUpperCase();
}
