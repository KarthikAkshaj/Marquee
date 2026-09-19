/** SPEC §8.9: .docx and .txt, up to 5 MB. */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export type ReadFileResult = { ok: true; name: string; text: string } | { ok: false; message: string };

/**
 * A dropped or picked file as plain text, read entirely in the browser so the
 * document never leaves the device. Word files go through mammoth's raw-text
 * extraction only (no HTML), one paragraph per line.
 */
export async function readImportFile(file: File): Promise<ReadFileResult> {
  const name = file.name;
  const lower = name.toLowerCase();

  if (lower.endsWith(".doc")) {
    return { ok: false, message: "That's the old .doc format. Open it in Word and Save As .docx, then drop that in." };
  }
  if (!lower.endsWith(".docx") && !lower.endsWith(".txt")) {
    return { ok: false, message: "Use a .docx or .txt file." };
  }
  if (file.size > IMPORT_MAX_BYTES) {
    return { ok: false, message: "That file is over 5 MB. Try pasting the list instead." };
  }

  try {
    if (lower.endsWith(".txt")) return { ok: true, name, text: await file.text() };
    // Loaded on demand: most visits never need a Word reader.
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { ok: true, name, text: value };
  } catch {
    return { ok: false, message: "Couldn't read that file. If it opens in Word, try Save As .docx again." };
  }
}
