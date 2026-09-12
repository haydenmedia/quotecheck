import { describe, expect, it, vi } from "vitest";
import { analyzeQuotesSafely } from "../src/lib/analysis-boundary";
import { DeterministicTextExtractionProvider } from "../src/lib/ingestion";
import type {
  CanonicalQuote,
  ExtractionProvider,
  QuoteReport,
  ReasoningProvider,
  TextIngestionInput,
} from "../src/lib/types";

const inputs: TextIngestionInput[] = [
  {
    id: "a",
    label: "Quote A",
    kind: "pasted_text",
    text: [
      "Vendor: Alpha Auto",
      "Total: $1200",
      "Warranty: [ambiguous] ask shop",
      "Timeline: [unreadable]",
    ].join("\n"),
  },
  {
    id: "b",
    label: "Quote B",
    kind: "pasted_text",
    text: "Vendor: Beta Auto\nTotal: $1350\nWarranty: 12 months",
  },
];

function reportFor(quotes: CanonicalQuote[]): QuoteReport {
  return {
    category: "automotive",
    quotes: quotes.map((quote) => ({
      id: quote.id,
      vendor: quote.vendor,
      total: quote.money.total,
      scopeIncluded: quote.inclusions,
      scopeExcluded: quote.exclusions,
      warranty: quote.warranty,
      timeline: quote.timeline,
      paymentTerms: quote.paymentTerms,
    })),
    findings: [],
    sections: [],
    overallGutCheck: "No material concern is apparent from the supplied quotes.",
    confidenceLimitations: [],
    noMaterialConcern: true,
  };
}

function reasoningSpy() {
  return {
    analyze: vi.fn(async ({ quotes }) => reportFor(quotes)),
  } satisfies ReasoningProvider;
}

describe("analysis extraction grounding boundary", () => {
  it("rejects fabricated confident fact and fabricated evidence excerpt before reasoning", async () => {
    const deterministic = new DeterministicTextExtractionProvider();
    const extraction: ExtractionProvider = {
      extract: vi.fn(async (input) => {
        const result = await deterministic.extract(input);
        if (input.id === "a") {
          result.quote.vendor = {
            value: "Fraud Co",
            certainty: "stated",
            evidence: [{
              quoteId: result.quote.id,
              sourceInputId: input.id,
              sourceLabel: input.label,
              excerpt: "Vendor: Fraud Co",
              locator: { line: 1 },
              confidence: 1,
            }],
          };
        }
        return result;
      }),
    };
    const reasoning = reasoningSpy();

    const result = await analyzeQuotesSafely(
      { reportSessionId: "fabricated-evidence", inputs, category: "automotive" },
      extraction,
      reasoning,
    );

    expect(result).toMatchObject({ ok: false, error: { code: "ANALYSIS_FAILED" } });
    expect(reasoning.analyze).not.toHaveBeenCalled();
  });

  it("rejects a fabricated confident value even when the evidence excerpt itself is real", async () => {
    const deterministic = new DeterministicTextExtractionProvider();
    const extraction: ExtractionProvider = {
      extract: vi.fn(async (input) => {
        const result = await deterministic.extract(input);
        if (input.id === "a") {
          result.quote.vendor = {
            value: "Fraud Co",
            certainty: "stated",
            evidence: result.quote.vendor.evidence,
          };
        }
        return result;
      }),
    };
    const reasoning = reasoningSpy();

    const result = await analyzeQuotesSafely(
      { reportSessionId: "fabricated-value", inputs, category: "automotive" },
      extraction,
      reasoning,
    );

    expect(result).toMatchObject({ ok: false, error: { code: "ANALYSIS_FAILED" } });
    expect(reasoning.analyze).not.toHaveBeenCalled();
  });

  it("rejects mismatched source label and raw text before reasoning", async () => {
    const deterministic = new DeterministicTextExtractionProvider();
    const badLabel: ExtractionProvider = {
      extract: vi.fn(async (input) => {
        const result = await deterministic.extract(input);
        if (input.id === "a") result.quote.vendor.evidence[0].sourceLabel = "Different quote";
        return result;
      }),
    };
    const badRawText: ExtractionProvider = {
      extract: vi.fn(async (input) => {
        const result = await deterministic.extract(input);
        if (input.id === "a") result.rawText = "Vendor: Fabricated";
        return result;
      }),
    };

    for (const extraction of [badLabel, badRawText]) {
      const reasoning = reasoningSpy();
      const result = await analyzeQuotesSafely(
        { reportSessionId: "source-identity", inputs, category: "automotive" },
        extraction,
        reasoning,
      );
      expect(result).toMatchObject({ ok: false, error: { code: "ANALYSIS_FAILED" } });
      expect(reasoning.analyze).not.toHaveBeenCalled();
    }
  });

  it("preserves valid stated, ambiguous, unreadable, and not-stated canonical states", async () => {
    const extraction = new DeterministicTextExtractionProvider();
    const reasoning = reasoningSpy();

    const result = await analyzeQuotesSafely(
      { reportSessionId: "valid-grounding", inputs, category: "automotive" },
      extraction,
      reasoning,
    );

    expect(result.ok).toBe(true);
    expect(reasoning.analyze).toHaveBeenCalledTimes(1);
    const request = reasoning.analyze.mock.calls[0][0];
    const quote = request.quotes[0];
    expect(quote.vendor.certainty).toBe("stated");
    expect(quote.warranty.certainty).toBe("ambiguous");
    expect(quote.timeline.certainty).toBe("unreadable");
    expect(quote.paymentTerms).toEqual({ value: null, certainty: "not_stated", evidence: [] });
  });
});
