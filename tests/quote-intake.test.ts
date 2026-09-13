import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_QUOTE_FILE_TYPES,
  canAnalyzeRealQuotes,
  createFileSelection,
  createTextSelection,
  isAcceptedQuoteFile,
  orderedQuoteSelections,
  removeQuoteSelection,
  setQuoteSelection,
  type QuoteSelections,
} from "../src/lib/quote-intake";

function file(name: string, type: string, size = 1234) {
  return { name, type, size } as Pick<File, "name" | "type" | "size">;
}

describe("CP13 real quote intake state", () => {
  it("accepts PDF/PNG/JPEG presentation formats and rejects unrelated files", () => {
    expect(ACCEPTED_QUOTE_FILE_TYPES).toEqual(["application/pdf", "image/png", "image/jpeg"]);
    expect(isAcceptedQuoteFile(file("quote.pdf", "application/pdf"))).toBe(true);
    expect(isAcceptedQuoteFile(file("quote.png", "image/png"))).toBe(true);
    expect(isAcceptedQuoteFile(file("quote.jpg", "image/jpeg"))).toBe(true);
    expect(isAcceptedQuoteFile(file("QUOTE.JPEG", ""))).toBe(true);
    expect(isAcceptedQuoteFile(file("quote.txt", "text/plain"))).toBe(false);
  });

  it("preserves pasted text exactly while rejecting whitespace-only input", () => {
    const source = " Vendor: North Star  \nTotal: $1,234.00\n";
    expect(createTextSelection(1, source)).toEqual({ kind: "pasted_text", slotId: 1, text: source });
    expect(createTextSelection(1, "  \n\t ")).toBeNull();
  });

  it("preserves slot identity/order across selection, replacement and optional third quote", () => {
    let selections: QuoteSelections = {};
    const quote2 = createTextSelection(2, "Quote two")!;
    const quote1 = createFileSelection(1, file("one.pdf", "application/pdf"))!;
    const quote3 = createTextSelection(3, "Quote three")!;
    selections = setQuoteSelection(selections, quote2);
    selections = setQuoteSelection(selections, quote1);
    selections = setQuoteSelection(selections, quote3);
    expect(orderedQuoteSelections(selections).map((selection) => selection.slotId)).toEqual([1, 2, 3]);

    const replacement = createTextSelection(1, "replacement one")!;
    selections = setQuoteSelection(selections, replacement);
    expect(orderedQuoteSelections(selections)[0]).toEqual(replacement);

    selections = removeQuoteSelection(selections, 3);
    expect(orderedQuoteSelections(selections).map((selection) => selection.slotId)).toEqual([1, 2]);
  });

  it("blocks Analyze until two valid real selections exist", () => {
    let selections: QuoteSelections = {};
    expect(canAnalyzeRealQuotes(selections)).toBe(false);
    selections = setQuoteSelection(selections, createTextSelection(1, "one")!);
    expect(canAnalyzeRealQuotes(selections)).toBe(false);
    selections = setQuoteSelection(selections, createTextSelection(2, "two")!);
    expect(canAnalyzeRealQuotes(selections)).toBe(true);
    selections = removeQuoteSelection(selections, 1);
    expect(canAnalyzeRealQuotes(selections)).toBe(false);
  });

  it("renders genuine accessible file/text controls without fixture analysis substitution", () => {
    const component = readFileSync("src/components/QuoteIntake.tsx", "utf8");
    const page = readFileSync("src/app/page.tsx", "utf8");
    const css = readFileSync("src/components/QuoteIntake.module.css", "utf8");

    expect(component).toContain('type="file"');
    expect(component).toContain("accept={ACCEPT_ATTRIBUTE}");
    expect(component).toContain("Remove");
    expect(component).toContain("Replace");
    expect(component).toContain("disabled={!canAnalyzeRealQuotes(selections)}");
    expect(component).toContain("will not substitute sample or fixture results");
    expect(component).not.toContain("demoReportStore");
    expect(component).not.toContain("DEMO_REPORT_SESSION_ID");
    expect(page).toContain("<QuoteIntake />");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("min-height: 44px");
  });
});
