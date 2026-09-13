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
  type QuoteSelectedFile,
  type QuoteSelections,
} from "../src/lib/quote-intake";

function file(name: string, type: string, size = 1234): QuoteSelectedFile {
  const bytes = new Uint8Array(size);
  return {
    name,
    type,
    size,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
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

  it("preserves slot identity/order and exact file source across selection and replacement", async () => {
    let selections: QuoteSelections = {};
    const quote2 = createTextSelection(2, "Quote two")!;
    const quote1File = file("one.pdf", "application/pdf");
    const quote1 = createFileSelection(1, quote1File)!;
    const quote3 = createTextSelection(3, "Quote three")!;
    selections = setQuoteSelection(selections, quote2);
    selections = setQuoteSelection(selections, quote1);
    selections = setQuoteSelection(selections, quote3);
    expect(orderedQuoteSelections(selections).map((selection) => selection.slotId)).toEqual([1, 2, 3]);
    expect(quote1.file).toBe(quote1File);
    expect((await quote1.file.arrayBuffer()).byteLength).toBe(1234);

    const replacement = createTextSelection(1, "replacement one")!;
    selections = setQuoteSelection(selections, replacement);
    expect(orderedQuoteSelections(selections)[0]).toEqual(replacement);

    selections = removeQuoteSelection(selections, 3);
    expect(orderedQuoteSelections(selections).map((selection) => selection.slotId)).toEqual([1, 2]);
  });

  it("requires Quote 1 and Quote 2 before Analyze while keeping Quote 3 optional", () => {
    const quote1 = createTextSelection(1, "one")!;
    const quote2 = createTextSelection(2, "two")!;
    const quote3 = createTextSelection(3, "three")!;

    const oneAndThree = setQuoteSelection(setQuoteSelection({}, quote1), quote3);
    expect(canAnalyzeRealQuotes(oneAndThree)).toBe(false);

    const twoAndThree = setQuoteSelection(setQuoteSelection({}, quote2), quote3);
    expect(canAnalyzeRealQuotes(twoAndThree)).toBe(false);

    const oneAndTwo = setQuoteSelection(setQuoteSelection({}, quote1), quote2);
    expect(canAnalyzeRealQuotes(oneAndTwo)).toBe(true);

    const allThree = setQuoteSelection(oneAndTwo, quote3);
    expect(canAnalyzeRealQuotes(allThree)).toBe(true);
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
