import { inflateSync } from "node:zlib";
import {
  ACCEPTED_QUOTE_FILE_TYPES,
  isAcceptedQuoteFile,
  type QuoteFileSelection,
  type QuoteSelection,
  type QuoteSlotId,
} from "./quote-intake";
import type { TextIngestionInput } from "./types";

export const MAX_QUOTE_FILE_BYTES = 10 * 1024 * 1024;

export type QuoteSourceFormat = "pasted_text" | "pdf" | "image";
export type QuoteExtractionMethod = "direct_text" | "local_pdf_text" | "image_provider";

export interface QuoteSourceMetadata {
  slotId: QuoteSlotId;
  sourceInputId: string;
  label: string;
  format: QuoteSourceFormat;
  extractionMethod: QuoteExtractionMethod;
  originalName?: string;
  mimeType?: string;
  size?: number;
}

export type QuoteSourceExtractionErrorCode =
  | "UNSUPPORTED_TYPE"
  | "OVERSIZED_FILE"
  | "EMPTY_SOURCE"
  | "UNREADABLE_PDF"
  | "IMAGE_PROVIDER_REQUIRED"
  | "IMAGE_EXTRACTION_FAILED";

export type QuoteSourceExtractionResult =
  | { ok: true; input: TextIngestionInput; source: QuoteSourceMetadata }
  | { ok: false; error: { code: QuoteSourceExtractionErrorCode; message: string; retryable: boolean } };

export interface QuoteBinarySource {
  slotId: QuoteSlotId;
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface ImageExtractionSource extends QuoteBinarySource {
  mimeType: "image/png" | "image/jpeg";
}

export interface ImageTextExtractionResult {
  text: string;
}

export interface ImageTextProvider {
  extract(source: ImageExtractionSource): Promise<ImageTextExtractionResult>;
}

export class ProviderRequiredImageTextProvider implements ImageTextProvider {
  async extract(): Promise<ImageTextExtractionResult> {
    throw new ImageProviderRequiredError();
  }
}

export class FixtureImageTextProvider implements ImageTextProvider {
  constructor(private readonly fixtureTextByName: Readonly<Record<string, string>>) {}

  async extract(source: ImageExtractionSource): Promise<ImageTextExtractionResult> {
    const text = this.fixtureTextByName[source.name];
    if (!text) throw new Error("No deterministic image fixture exists for this source.");
    return { text };
  }
}

class ImageProviderRequiredError extends Error {}

function sourceInputId(slotId: QuoteSlotId): string {
  return `quote-slot-${slotId}`;
}

function sourceLabel(slotId: QuoteSlotId, name?: string): string {
  return name ? `Quote ${slotId} · ${name}` : `Quote ${slotId} · pasted text`;
}

function failure(
  code: QuoteSourceExtractionErrorCode,
  message: string,
  retryable = true,
): QuoteSourceExtractionResult {
  return { ok: false, error: { code, message, retryable } };
}

function isImageMimeType(value: string): value is ImageExtractionSource["mimeType"] {
  return value === "image/png" || value === "image/jpeg";
}

function normalizedMimeType(source: Pick<QuoteBinarySource, "name" | "mimeType">): string {
  if (source.mimeType === "application/pdf" || isImageMimeType(source.mimeType)) return source.mimeType;
  const name = source.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return source.mimeType;
}

function decodePdfLiteralString(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      output += char;
      continue;
    }

    const next = value[index + 1];
    if (next === undefined) break;
    if (next === "\n") {
      index += 1;
      continue;
    }
    if (next === "\r") {
      if (value[index + 2] === "\n") index += 1;
      index += 1;
      continue;
    }

    const escaped: Record<string, string> = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      "(": "(",
      ")": ")",
      "\\": "\\",
    };
    if (escaped[next] !== undefined) {
      output += escaped[next];
      index += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      const octal = value.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
      output += String.fromCharCode(Number.parseInt(octal, 8));
      index += octal.length;
      continue;
    }

    output += next;
    index += 1;
  }
  return output;
}

function extractTextOperators(content: string): string[] {
  const fragments: string[] = [];
  const direct = /\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g;
  for (const match of content.matchAll(direct)) {
    const text = decodePdfLiteralString(match[1]).trim();
    if (text) fragments.push(text);
  }

  const arrays = /\[((?:.|\r|\n)*?)\]\s*TJ/g;
  for (const match of content.matchAll(arrays)) {
    const parts = [...match[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)]
      .map((part) => decodePdfLiteralString(part[1]))
      .join("")
      .trim();
    if (parts) fragments.push(parts);
  }
  return fragments;
}

function pdfStreamContents(bytes: Uint8Array): string[] {
  const binary = Buffer.from(bytes).toString("latin1");
  const streams: string[] = [];
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;

  for (const match of binary.matchAll(streamPattern)) {
    const streamIndex = match.index ?? 0;
    const dictionaryStart = binary.lastIndexOf("<<", streamIndex);
    const dictionaryEnd = dictionaryStart >= 0 ? binary.indexOf(">>", dictionaryStart) : -1;
    const dictionary = dictionaryStart >= 0 && dictionaryEnd >= dictionaryStart && dictionaryEnd < streamIndex
      ? binary.slice(dictionaryStart, dictionaryEnd + 2)
      : "";
    const raw = Buffer.from(match[1], "latin1");

    if (dictionary.includes("/FlateDecode")) {
      try {
        streams.push(inflateSync(raw).toString("latin1"));
      } catch {
        continue;
      }
    } else {
      streams.push(match[1]);
    }
  }
  return streams;
}

export function extractTextFromPdfBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 8 || Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") return null;

  const fragments = pdfStreamContents(bytes).flatMap(extractTextOperators);
  const text = fragments.join("\n").replace(/\u0000/g, "").trim();
  return text || null;
}

export async function extractBinaryQuoteSource(
  source: QuoteBinarySource,
  imageProvider: ImageTextProvider = new ProviderRequiredImageTextProvider(),
): Promise<QuoteSourceExtractionResult> {
  const mimeType = normalizedMimeType(source);
  const accepted = isAcceptedQuoteFile({ name: source.name, type: mimeType });
  if (!accepted) return failure("UNSUPPORTED_TYPE", "Choose a PDF, PNG, JPG or JPEG quote file.", false);
  if (source.bytes.byteLength === 0) return failure("EMPTY_SOURCE", "This quote file is empty. Choose another file.");
  if (source.bytes.byteLength > MAX_QUOTE_FILE_BYTES) {
    return failure("OVERSIZED_FILE", "This quote file is too large. Choose a file up to 10 MB.", false);
  }

  let text: string | null = null;
  let format: QuoteSourceFormat;
  let extractionMethod: QuoteExtractionMethod;

  if (mimeType === "application/pdf") {
    format = "pdf";
    extractionMethod = "local_pdf_text";
    text = extractTextFromPdfBytes(source.bytes);
    if (!text) {
      return failure("UNREADABLE_PDF", "QuoteCheck could not read text from this PDF. Try a clearer PDF, image, or pasted text.");
    }
  } else if (isImageMimeType(mimeType)) {
    format = "image";
    extractionMethod = "image_provider";
    try {
      text = (await imageProvider.extract({ ...source, mimeType })).text.trim();
    } catch (error) {
      if (error instanceof ImageProviderRequiredError) {
        return failure("IMAGE_PROVIDER_REQUIRED", "Image text extraction is not configured yet. Use a PDF or pasted text for now.", false);
      }
      return failure("IMAGE_EXTRACTION_FAILED", "QuoteCheck could not read text from this image. Try another image or paste the quote text.");
    }
    if (!text) return failure("IMAGE_EXTRACTION_FAILED", "QuoteCheck could not read text from this image. Try another image or paste the quote text.");
  } else {
    return failure("UNSUPPORTED_TYPE", "Choose a PDF, PNG, JPG or JPEG quote file.", false);
  }

  const id = sourceInputId(source.slotId);
  const label = sourceLabel(source.slotId, source.name);
  return {
    ok: true,
    // The canonical contract currently names all pre-extracted text "extracted_text_fixture".
    // Source metadata above is the authoritative distinction between a real selected source and a CI fixture.
    input: { id, label, kind: "extracted_text_fixture", text },
    source: {
      slotId: source.slotId,
      sourceInputId: id,
      label,
      format,
      extractionMethod,
      originalName: source.name,
      mimeType,
      size: source.bytes.byteLength,
    },
  };
}

export async function extractQuoteSelection(
  selection: QuoteSelection,
  imageProvider: ImageTextProvider = new ProviderRequiredImageTextProvider(),
): Promise<QuoteSourceExtractionResult> {
  if (selection.kind === "pasted_text") {
    if (!selection.text.trim()) return failure("EMPTY_SOURCE", "Paste meaningful quote text before analyzing.");
    const id = sourceInputId(selection.slotId);
    const label = sourceLabel(selection.slotId);
    return {
      ok: true,
      input: { id, label, kind: "pasted_text", text: selection.text },
      source: {
        slotId: selection.slotId,
        sourceInputId: id,
        label,
        format: "pasted_text",
        extractionMethod: "direct_text",
      },
    };
  }

  return extractFileSelection(selection, imageProvider);
}

async function extractFileSelection(
  selection: QuoteFileSelection,
  imageProvider: ImageTextProvider,
): Promise<QuoteSourceExtractionResult> {
  if (selection.size > MAX_QUOTE_FILE_BYTES) {
    return failure("OVERSIZED_FILE", "This quote file is too large. Choose a file up to 10 MB.", false);
  }
  const bytes = new Uint8Array(await selection.file.arrayBuffer());
  return extractBinaryQuoteSource({
    slotId: selection.slotId,
    name: selection.name,
    mimeType: selection.mimeType,
    bytes,
  }, imageProvider);
}
