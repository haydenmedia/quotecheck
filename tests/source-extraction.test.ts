import { describe, expect, it } from "vitest";
import { ingestTextQuote } from "../src/lib/ingestion";
import { createFileSelection, createTextSelection, type QuoteSelectedFile } from "../src/lib/quote-intake";
import {
  FixtureImageTextProvider,
  MAX_QUOTE_FILE_BYTES,
  extractBinaryQuoteSource,
  extractQuoteSelection,
  extractTextFromPdfBytes,
} from "../src/lib/source-extraction";

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function textPdf(...lines: string[]): Uint8Array {
  const operators = lines.map((line) => `(${line.replace(/[()\\]/g, "\\$&")}) Tj`).join("\n");
  return bytes(`%PDF-1.4\n1 0 obj\n<< /Length ${operators.length} >>\nstream\n${operators}\nendstream\nendobj\n%%EOF`);
}

function selectedFile(name: string, type: string, contents: Uint8Array): QuoteSelectedFile {
  return {
    name,
    type,
    size: contents.byteLength,
    async arrayBuffer() {
      return contents.buffer.slice(contents.byteOffset, contents.byteOffset + contents.byteLength);
    },
  };
}

describe("CP13 real source extraction", () => {
  it("preserves exact pasted text, slot identity and canonical evidence", async () => {
    const sourceText = "Vendor: Exact Source Co\nExcluded: Permit fees\nWarranty: [ambiguous] confirm in writing\nTotal: $1234";
    const selection = createTextSelection(2, sourceText)!;
    const result = await extractQuoteSelection(selection);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input).toEqual({
      id: "quote-slot-2",
      label: "Quote 2 · pasted text",
      kind: "pasted_text",
      text: sourceText,
    });
    expect(result.source.slotId).toBe(2);
    expect(result.source.extractionMethod).toBe("direct_text");

    const canonical = ingestTextQuote(result.input).quote;
    expect(canonical.exclusions[0].value).toBe("Permit fees");
    expect(canonical.warranty.certainty).toBe("ambiguous");
    expect(canonical.vendor.evidence[0].sourceInputId).toBe("quote-slot-2");
    expect(canonical.vendor.evidence[0].sourceLabel).toBe("Quote 2 · pasted text");
  });

  it("extracts real text operators from selected PDF bytes without fixture substitution", async () => {
    const pdf = textPdf(
      "Vendor: File Only Roofing",
      "Subtotal: $1000",
      "Tax: $50",
      "Fees: $0",
      "Total: $1050",
      "Excluded: Disposal",
    );
    expect(extractTextFromPdfBytes(pdf)).toContain("File Only Roofing");

    const selection = createFileSelection(1, selectedFile("roof.pdf", "application/pdf", pdf))!;
    const result = await extractQuoteSelection(selection);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.input.kind).toBe("extracted_text");
    expect(result.input.text).toContain("Vendor: File Only Roofing");
    expect(result.input.text).toContain("Excluded: Disposal");
    expect(result.input.text).not.toContain("North Star");
    expect(result.source).toMatchObject({
      slotId: 1,
      originalName: "roof.pdf",
      mimeType: "application/pdf",
      format: "pdf",
      extractionMethod: "local_pdf_text",
    });

    const canonical = ingestTextQuote(result.input).quote;
    expect(canonical.vendor.value).toBe("File Only Roofing");
    expect(canonical.money.total.value).toBe(1050);
    expect(canonical.exclusions[0].value).toBe("Disposal");
    expect(canonical.vendor.evidence[0].sourceLabel).toBe("Quote 1 · roof.pdf");
  });

  it("fails safely for malformed or image-only PDFs instead of inventing content", async () => {
    const malformed = await extractBinaryQuoteSource({
      slotId: 1,
      name: "bad.pdf",
      mimeType: "application/pdf",
      bytes: bytes("not a pdf"),
    });
    expect(malformed).toMatchObject({ ok: false, error: { code: "UNREADABLE_PDF" } });

    const imageOnlyPdf = await extractBinaryQuoteSource({
      slotId: 1,
      name: "scan.pdf",
      mimeType: "application/pdf",
      bytes: bytes("%PDF-1.4\n1 0 obj\n<< /Subtype /Image >>\nendobj\n%%EOF"),
    });
    expect(imageOnlyPdf).toMatchObject({ ok: false, error: { code: "UNREADABLE_PDF" } });
  });

  it("uses an explicit image provider seam and never fakes OCR", async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    const unsupported = await extractBinaryQuoteSource({
      slotId: 3,
      name: "phone-photo.png",
      mimeType: "image/png",
      bytes: imageBytes,
    });
    expect(unsupported).toMatchObject({
      ok: false,
      error: { code: "IMAGE_PROVIDER_REQUIRED", retryable: false },
    });

    const provider = new FixtureImageTextProvider({
      "phone-photo.png": "Vendor: Camera Source\nTotal: $777\nUncertain: handwritten allowance",
    });
    const extracted = await extractBinaryQuoteSource({
      slotId: 3,
      name: "phone-photo.png",
      mimeType: "image/png",
      bytes: imageBytes,
    }, provider);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.input.text).toContain("Camera Source");
    expect(extracted.input.kind).toBe("extracted_text");
    expect(extracted.source.extractionMethod).toBe("image_provider");
  });

  it("rejects unsupported, empty and oversized files with bounded safe errors", async () => {
    const unsupported = await extractBinaryQuoteSource({
      slotId: 1,
      name: "quote.exe",
      mimeType: "application/octet-stream",
      bytes: new Uint8Array([1]),
    });
    expect(unsupported).toMatchObject({ ok: false, error: { code: "UNSUPPORTED_TYPE" } });

    const empty = await extractBinaryQuoteSource({
      slotId: 1,
      name: "quote.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(),
    });
    expect(empty).toMatchObject({ ok: false, error: { code: "EMPTY_SOURCE" } });

    const oversized = await extractBinaryQuoteSource({
      slotId: 1,
      name: "quote.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(MAX_QUOTE_FILE_BYTES + 1),
    });
    expect(oversized).toMatchObject({ ok: false, error: { code: "OVERSIZED_FILE", retryable: false } });
  });
});
