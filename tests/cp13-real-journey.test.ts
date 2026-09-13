import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bindSuccessfulGeneratedAnalysis,
  getGeneratedReport,
  unlockGeneratedReportSession,
} from "../src/lib/generated-report-access";
import {
  canAnalyzeRealQuotes,
  createFileSelection,
  createTextSelection,
  removeQuoteSelection,
  setQuoteSelection,
  type QuoteSelectedFile,
  type QuoteSelections,
} from "../src/lib/quote-intake";
import { analyzeRealQuoteSelections } from "../src/lib/real-analysis";

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

function fixture(path: string): Uint8Array {
  return Uint8Array.from(readFileSync(path));
}

describe("CP13-05 real-user journey regression", () => {
  it("carries two genuine local inputs through extraction, grounded analysis, preview session, and same-session unlock", async () => {
    const alphaText = readFileSync("tests/fixtures/cp13-alpha-quote.txt", "utf8");
    const betaPdf = fixture("tests/fixtures/cp13-beta-quote.pdf");

    let selections: QuoteSelections = {};
    const quote1 = createTextSelection(1, alphaText);
    const quote2 = createFileSelection(2, selectedFile("cp13-beta-quote.pdf", "application/pdf", betaPdf));
    expect(quote1).not.toBeNull();
    expect(quote2).not.toBeNull();
    if (!quote1 || !quote2) return;

    selections = setQuoteSelection(selections, quote1);
    expect(canAnalyzeRealQuotes(selections)).toBe(false);
    selections = setQuoteSelection(selections, quote2);
    expect(canAnalyzeRealQuotes(selections)).toBe(true);

    const result = await analyzeRealQuoteSelections(selections, "renovation", {
      createReportSessionId: () => "cp13-owner-journey-session",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.reportSessionId).toBe("cp13-owner-journey-session");
    expect(result.sources).toEqual([
      expect.objectContaining({
        slotId: 1,
        sourceInputId: "quote-slot-1",
        format: "pasted_text",
        extractionMethod: "direct_text",
      }),
      expect.objectContaining({
        slotId: 2,
        sourceInputId: "quote-slot-2",
        format: "pdf",
        extractionMethod: "local_pdf_text",
        originalName: "cp13-beta-quote.pdf",
        mimeType: "application/pdf",
        size: betaPdf.byteLength,
      }),
    ]);
    expect(result.report.quotes.map((quote) => quote.vendor.value)).toEqual([
      "Cedar Ridge Renovations",
      "Northern Peak Contracting",
    ]);
    expect(result.report.findings.some((finding) => finding.title.includes("explicitly excludes Permit fees"))).toBe(true);
    expect(result.report.findings.some((finding) => finding.title.includes("Northern Peak Contracting"))).toBe(true);

    const evidence = result.report.findings.flatMap((finding) => finding.evidenceRefs);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((ref) => ["quote-slot-1", "quote-slot-2"].includes(ref.sourceInputId ?? ""))).toBe(true);
    expect(evidence.some((ref) => /Permit fees|Cedar Ridge Renovations|Northern Peak Contracting/.test(ref.excerpt))).toBe(true);

    let cookieSessionId: string | null = null;
    const locked = await bindSuccessfulGeneratedAnalysis(result, (reportSessionId) => {
      cookieSessionId = reportSessionId;
    });

    expect(cookieSessionId).toBe(result.reportSessionId);
    expect(locked?.reportSessionId).toBe(result.reportSessionId);
    expect(locked?.access).toBe("locked");
    expect(locked?.report).toEqual(result.report);
    expect((await getGeneratedReport(cookieSessionId))?.report).toEqual(result.report);

    const unlocked = await unlockGeneratedReportSession(cookieSessionId);
    expect(unlocked?.reportSessionId).toBe(result.reportSessionId);
    expect(unlocked?.access).toBe("unlocked");
    expect(unlocked?.report).toEqual(result.report);
    expect(await getGeneratedReport("cp13-unrelated-session")).toBeNull();
  });

  it("preserves required Quote 1 + Quote 2 gating while allowing Quote 3 to be added, replaced, or removed", () => {
    let selections: QuoteSelections = {};
    const q1 = createTextSelection(1, "Vendor: One\nTotal: $100")!;
    const q2 = createTextSelection(2, "Vendor: Two\nTotal: $200")!;
    const q3 = createTextSelection(3, "Vendor: Three\nTotal: $300")!;

    selections = setQuoteSelection(selections, q1);
    expect(canAnalyzeRealQuotes(selections)).toBe(false);
    selections = setQuoteSelection(selections, q2);
    expect(canAnalyzeRealQuotes(selections)).toBe(true);
    selections = setQuoteSelection(selections, q3);
    expect(selections[3]).toEqual(q3);

    const q3Replacement = createTextSelection(3, "Vendor: Three Revised\nTotal: $325")!;
    selections = setQuoteSelection(selections, q3Replacement);
    expect(selections[3]).toEqual(q3Replacement);

    selections = removeQuoteSelection(selections, 3);
    expect(selections[3]).toBeUndefined();
    expect(canAnalyzeRealQuotes(selections)).toBe(true);

    selections = removeQuoteSelection(selections, 2);
    expect(canAnalyzeRealQuotes(selections)).toBe(false);
  });

  it("fails an image journey explicitly when no image provider is authorized and never stores a report", async () => {
    let selections: QuoteSelections = {};
    const image = createFileSelection(1, selectedFile("owner-photo.jpg", "image/jpeg", new Uint8Array([255, 216, 255, 1, 2, 3])))!;
    const text = createTextSelection(2, "Vendor: Safe Text Quote\nTotal: $500")!;
    selections = setQuoteSelection(selections, image);
    selections = setQuoteSelection(selections, text);

    const result = await analyzeRealQuoteSelections(selections, "general", {
      createReportSessionId: () => "cp13-image-provider-required",
    });

    expect(result).toMatchObject({
      ok: false,
      reportSessionId: "cp13-image-provider-required",
      error: {
        code: "SOURCE_EXTRACTION_FAILED",
        slotId: 1,
        sourceCode: "IMAGE_PROVIDER_REQUIRED",
      },
    });

    const bound = await bindSuccessfulGeneratedAnalysis(result, () => {
      throw new Error("failed analysis must not set a report-session cookie");
    });
    expect(bound).toBeNull();
    expect(await getGeneratedReport("cp13-image-provider-required")).toBeNull();
  });

  it("keeps critical mobile/accessibility journey hooks in the actual intake UI", () => {
    const intake = readFileSync("src/components/QuoteIntake.tsx", "utf8");
    const css = readFileSync("src/components/QuoteIntake.module.css", "utf8");

    expect(intake).toContain('type="file"');
    expect(intake).toContain('accept={ACCEPT_ATTRIBUTE}');
    expect(intake).toContain('aria-label={`Choose file for Quote ${slotId}`}');
    expect(intake).toContain('role="status"');
    expect(intake).toContain('role="alert"');
    expect(intake).toContain('aria-live="polite"');
    expect(intake).toContain("Replace file");
    expect(intake).toContain("Replace with pasted text");
    expect(intake).toContain(">Remove</button>");
    expect(intake).toContain('disabled={!canAnalyzeRealQuotes(selections) || pending}');
    expect(css).toContain("@media");
  });
});
