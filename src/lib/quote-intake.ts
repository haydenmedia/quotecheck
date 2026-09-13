export const QUOTE_SLOT_IDS = [1, 2, 3] as const;
export type QuoteSlotId = (typeof QUOTE_SLOT_IDS)[number];

export const ACCEPTED_QUOTE_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"] as const;

export interface QuoteSelectedFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type QuoteFileSelection = {
  kind: "file";
  slotId: QuoteSlotId;
  name: string;
  mimeType: string;
  size: number;
  file: QuoteSelectedFile;
};

export type QuoteTextSelection = {
  kind: "pasted_text";
  slotId: QuoteSlotId;
  text: string;
};

export type QuoteSelection = QuoteFileSelection | QuoteTextSelection;
export type QuoteSelections = Partial<Record<QuoteSlotId, QuoteSelection>>;

export function isAcceptedQuoteFile(file: Pick<QuoteSelectedFile, "name" | "type">): boolean {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return ACCEPTED_QUOTE_FILE_TYPES.includes(mime as (typeof ACCEPTED_QUOTE_FILE_TYPES)[number])
    || ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function createFileSelection(slotId: QuoteSlotId, file: QuoteSelectedFile): QuoteFileSelection | null {
  if (!isAcceptedQuoteFile(file)) return null;
  return {
    kind: "file",
    slotId,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    file,
  };
}

export function createTextSelection(slotId: QuoteSlotId, text: string): QuoteTextSelection | null {
  if (!text.trim()) return null;
  return { kind: "pasted_text", slotId, text };
}

export function setQuoteSelection(
  selections: QuoteSelections,
  selection: QuoteSelection,
): QuoteSelections {
  return { ...selections, [selection.slotId]: selection };
}

export function removeQuoteSelection(selections: QuoteSelections, slotId: QuoteSlotId): QuoteSelections {
  const next = { ...selections };
  delete next[slotId];
  return next;
}

export function orderedQuoteSelections(selections: QuoteSelections): QuoteSelection[] {
  return QUOTE_SLOT_IDS.flatMap((slotId) => selections[slotId] ? [selections[slotId]!] : []);
}

export function canAnalyzeRealQuotes(selections: QuoteSelections): boolean {
  return Boolean(selections[1] && selections[2]);
}
