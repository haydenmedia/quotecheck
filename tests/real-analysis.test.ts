import { describe, expect, it } from "vitest";
import { createFileSelection, createTextSelection, setQuoteSelection, type QuoteSelectedFile, type QuoteSelections } from "../src/lib/quote-intake";
import { analyzeRealQuoteSelections } from "../src/lib/real-analysis";
import type { ExtractionProvider } from "../src/lib/types";

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
      return Uint8Array.from(contents).buffer;
    },
  };
}

function add(selections: QuoteSelections, selection: NonNullable<ReturnType<typeof createTextSelection>> | NonNullable<ReturnType<typeof createFileSelection>>): QuoteSelections {
  return setQuoteSelection(selections, selection);
}

describe("CP13 real analysis wiring", () => {
  it("uses the exact selected pasted text and PDF content through canonical evidence and reasoning", async () => {
    let selections: QuoteSelections = {};
    selections = add(selections, createTextSelection(1,
      "Vendor: Alpha Real Quote\nSubtotal: $1000\nTax: $50\nFees: $0\nTotal: $1050\nExcluded: Permit fees\nWarranty: 2 years\nTimeline: 4 weeks\nPayment terms: 50% deposit")!);
    const pdf = textPdf(
      "Vendor: Beta PDF Quote",
      "Subtotal: $1200",
      "Tax: $60",
      "Fees: $0",
      "Total: $1260",
      "Included: Permit fees",
      "Warranty: 5 years",
      "Timeline: 3 weeks",
      "Payment terms: 25% deposit",
    );
    selections = add(selections, createFileSelection(2, selectedFile("beta.pdf", "application/pdf", pdf))!);

    const result = await analyzeRealQuoteSelections(selections, "renovation", {
      createReportSessionId: () => "real-session-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reportSessionId).toBe("real-session-1");
    expect(result.sources.map((source) => source.sourceInputId)).toEqual(["quote-slot-1", "quote-slot-2"]);
    expect(result.report.quotes.map((quote) => quote.vendor.value)).toEqual(["Alpha Real Quote", "Beta PDF Quote"]);
    expect(result.report.findings.some((finding) => finding.title.includes("Alpha Real Quote"))).toBe(true);
    expect(result.report.findings.some((finding) => finding.title.includes("Beta PDF Quote"))).toBe(true);
    expect(result.report.findings.flatMap((finding) => finding.evidenceRefs).every((ref) =>
      !ref.excerpt.includes("North Star") && ["quote-slot-1", "quote-slot-2"].includes(ref.sourceInputId ?? ""),
    )).toBe(true);
    expect(result.report.findings.some((finding) => finding.title.includes("explicitly excludes Permit fees"))).toBe(true);
  });

  it("supports the optional third exact source without replacing the required inputs", async () => {
    let selections: QuoteSelections = {};
    selections = add(selections, createTextSelection(1, "Vendor: One\nTotal: $100\nWarranty: 1 year\nTimeline: 1 week\nPayment terms: Due on completion")!);
    selections = add(selections, createTextSelection(2, "Vendor: Two\nTotal: $200\nWarranty: 2 years\nTimeline: 2 weeks\nPayment terms: Due on completion")!);
    selections = add(selections, createTextSelection(3, "Vendor: Three\nTotal: $300\nWarranty: 3 years\nTimeline: 3 weeks\nPayment terms: Due on completion")!);

    const result = await analyzeRealQuoteSelections(selections, "general", {
      createReportSessionId: () => "real-session-3",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sources.map((source) => source.slotId)).toEqual([1, 2, 3]);
    expect(result.report.quotes.map((quote) => quote.vendor.value)).toEqual(["One", "Two", "Three"]);
  });

  it("stops safely when image extraction is not configured", async () => {
    const image = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    let selections: QuoteSelections = {};
    selections = add(selections, createFileSelection(1, selectedFile("quote.png", "image/png", image))!);
    selections = add(selections, createTextSelection(2, "Vendor: Text Quote\nTotal: $100")!);

    const result = await analyzeRealQuoteSelections(selections, "general", {
      createReportSessionId: () => "image-session",
    });

    expect(result).toMatchObject({
      ok: false,
      reportSessionId: "image-session",
      error: {
        code: "SOURCE_EXTRACTION_FAILED",
        slotId: 1,
        sourceCode: "IMAGE_PROVIDER_REQUIRED",
      },
    });
  });

  it("rejects mismatched or fabricated extraction-provider output before reasoning", async () => {
    const invalidProvider: ExtractionProvider = {
      async extract(input) {
        return {
          sourceInputId: "fixture-id-that-was-not-selected",
          rawText: input.text,
          quote: {
            id: "fabricated",
            sourceInputIds: ["fixture-id-that-was-not-selected"],
            vendor: { value: "Fabricated Vendor", certainty: "stated", evidence: [] },
            quoteDate: { value: null, certainty: "not_stated", evidence: [] },
            expiryDate: { value: null, certainty: "not_stated", evidence: [] },
            projectDescription: { value: null, certainty: "not_stated", evidence: [] },
            lineItems: [],
            money: {
              subtotal: { value: null, certainty: "not_stated", evidence: [] },
              tax: { value: null, certainty: "not_stated", evidence: [] },
              fees: { value: null, certainty: "not_stated", evidence: [] },
              total: { value: 999999, certainty: "stated", evidence: [] },
            },
            allowances: [], inclusions: [], exclusions: [],
            warranty: { value: null, certainty: "not_stated", evidence: [] },
            timeline: { value: null, certainty: "not_stated", evidence: [] },
            paymentTerms: { value: null, certainty: "not_stated", evidence: [] },
            conditions: [], uncertainties: [], warnings: [],
          },
        };
      },
    };

    let selections: QuoteSelections = {};
    selections = add(selections, createTextSelection(1, "Vendor: Real One\nTotal: $100")!);
    selections = add(selections, createTextSelection(2, "Vendor: Real Two\nTotal: $200")!);

    const result = await analyzeRealQuoteSelections(selections, "general", {
      extractionProvider: invalidProvider,
      createReportSessionId: () => "invalid-provider-session",
    });

    expect(result).toMatchObject({
      ok: false,
      reportSessionId: "invalid-provider-session",
      error: { code: "ANALYSIS_FAILED", sourceCode: "ANALYSIS_FAILED" },
    });
  });

  it("preserves ambiguity, explicit exclusions and arithmetic warnings without inventing charges", async () => {
    let selections: QuoteSelections = {};
    selections = add(selections, createTextSelection(1,
      "Vendor: Trust One\nSubtotal: $100\nTax: $5\nFees: $0\nTotal: $999\nExcluded: Disposal\nWarranty: [ambiguous] ask vendor\nTimeline: 2 weeks\nPayment terms: Due on completion")!);
    selections = add(selections, createTextSelection(2,
      "Vendor: Trust Two\nSubtotal: $100\nTax: $5\nFees: $0\nTotal: $105\nWarranty: 2 years\nTimeline: 2 weeks\nPayment terms: Due on completion")!);

    const result = await analyzeRealQuoteSelections(selections, "trades", {
      createReportSessionId: () => "trust-session",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.findings.some((finding) => finding.title === "Quoted arithmetic needs clarification")).toBe(true);
    expect(result.report.findings.some((finding) => finding.title.includes("explicitly excludes Disposal"))).toBe(true);
    expect(result.report.findings.some((finding) => finding.title === "Warranty is ambiguous")).toBe(true);
    expect(result.report.findings.some((finding) => /extra charge/i.test(finding.title))).toBe(false);
  });

  it("can validly return no material concern when the selected quotes support it", async () => {
    const same = "Vendor: Same\nTotal: $100\nWarranty: 2 years\nTimeline: 2 weeks\nPayment terms: Due on completion";
    let selections: QuoteSelections = {};
    selections = add(selections, createTextSelection(1, same)!);
    selections = add(selections, createTextSelection(2, same.replace("Vendor: Same", "Vendor: Same"))!);

    const result = await analyzeRealQuoteSelections(selections, "general", {
      createReportSessionId: () => "clear-session",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.noMaterialConcern).toBe(true);
    expect(result.report.overallGutCheck).toContain("No material concern");
  });
});
