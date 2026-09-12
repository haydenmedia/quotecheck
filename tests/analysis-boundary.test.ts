import { describe, expect, it, vi } from "vitest";
import {
  ANALYSIS_INPUT_LIMITS,
  analyzeQuotesSafely,
  validateAnalysisInputs,
} from "../src/lib/analysis-boundary";
import { DeterministicTextExtractionProvider } from "../src/lib/ingestion";
import type {
  CanonicalQuote,
  QuoteReport,
  ReasoningProvider,
  TextIngestionInput,
} from "../src/lib/types";

const validInputs: TextIngestionInput[] = [
  {
    id: "a",
    label: "Quote A",
    kind: "pasted_text",
    text: "Vendor: Alpha Auto\nTotal: $1200\nWarranty: [ambiguous] ask shop",
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

function reasoningSpy(implementation?: ReasoningProvider["analyze"]) {
  return {
    analyze: vi.fn(implementation ?? (async ({ quotes }) => reportFor(quotes))),
  } satisfies ReasoningProvider;
}

describe("analysis input boundary", () => {
  it("rejects fewer than two and more than three quotes", () => {
    expect(validateAnalysisInputs(validInputs.slice(0, 1))?.code).toBe("INVALID_QUOTE_COUNT");
    expect(validateAnalysisInputs([...validInputs, validInputs[0], validInputs[1]])?.code).toBe("INVALID_QUOTE_COUNT");
  });

  it("rejects unsupported input kinds before extraction", async () => {
    const extraction = {
      extract: vi.fn(async (_input: TextIngestionInput) => {
        throw new Error("should not run");
      }),
    };
    const reasoning = reasoningSpy();
    const inputs = structuredClone(validInputs) as unknown as Array<Record<string, unknown>>;
    inputs[0].kind = "application/pdf";

    const result = await analyzeQuotesSafely(
      { reportSessionId: "report-1", inputs: inputs as unknown as TextIngestionInput[], category: "automotive" },
      extraction,
      reasoning,
    );

    expect(result).toMatchObject({ ok: false, reportSessionId: "report-1", error: { code: "UNSUPPORTED_INPUT_TYPE" } });
    expect(extraction.extract).not.toHaveBeenCalled();
    expect(reasoning.analyze).not.toHaveBeenCalled();
  });

  it("rejects oversized individual and combined text", () => {
    const oversized = structuredClone(validInputs);
    oversized[0].text = "x".repeat(ANALYSIS_INPUT_LIMITS.maxTextCharactersPerQuote + 1);
    expect(validateAnalysisInputs(oversized)?.code).toBe("OVERSIZED_INPUT");

    const combined = [
      { ...validInputs[0], text: "x".repeat(90_000) },
      { ...validInputs[1], text: "y".repeat(90_000) },
      { ...validInputs[1], id: "c", label: "Quote C", text: "z".repeat(90_000) },
    ];
    expect(validateAnalysisInputs(combined)?.code).toBe("OVERSIZED_INPUT");
  });

  it("rejects malformed and duplicate inputs without invoking analysis", async () => {
    const extraction = {
      extract: vi.fn(async (_input: TextIngestionInput) => {
        throw new Error("should not run");
      }),
    };
    const reasoning = reasoningSpy();
    const malformed = [{ ...validInputs[0], text: "   " }, validInputs[1]];
    const duplicate = [validInputs[0], { ...validInputs[1], id: validInputs[0].id }];

    expect(validateAnalysisInputs(malformed)?.code).toBe("MALFORMED_INPUT");
    expect(validateAnalysisInputs(duplicate)?.code).toBe("MALFORMED_INPUT");

    await analyzeQuotesSafely(
      { reportSessionId: "report-2", inputs: malformed, category: "automotive" },
      extraction,
      reasoning,
    );
    expect(extraction.extract).not.toHaveBeenCalled();
    expect(reasoning.analyze).not.toHaveBeenCalled();
  });

  it("returns a recoverable generic failure without leaking provider internals or substituting report identity", async () => {
    const extraction = {
      extract: vi.fn(async (_input: TextIngestionInput) => {
        throw new Error("provider=openai model=secret-model OPENAI_API_KEY=sk-do-not-leak stack=/srv/internal.ts");
      }),
    };
    const reasoning = reasoningSpy();

    const result = await analyzeQuotesSafely(
      { reportSessionId: "owned-report-77", inputs: validInputs, category: "automotive" },
      extraction,
      reasoning,
    );

    expect(result).toEqual({
      ok: false,
      reportSessionId: "owned-report-77",
      error: {
        code: "ANALYSIS_FAILED",
        message: "We could not finish this comparison. Your report remains unchanged; please try again.",
        retryable: true,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/openai|secret-model|sk-do-not-leak|internal\.ts/i);
    expect(reasoning.analyze).not.toHaveBeenCalled();
  });

  it("contains reasoning failures and returns no stale or fabricated report payload", async () => {
    const extraction = new DeterministicTextExtractionProvider();
    const reasoning = reasoningSpy(async () => {
      throw new Error("reasoning failed with internal details");
    });

    const result = await analyzeQuotesSafely(
      { reportSessionId: "report-3", inputs: validInputs, category: "automotive" },
      extraction,
      reasoning,
    );

    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("report");
    expect(result.reportSessionId).toBe("report-3");
  });

  it("preserves the valid golden path and canonical uncertainty/source evidence", async () => {
    const extraction = new DeterministicTextExtractionProvider();
    const reasoning = reasoningSpy();

    const result = await analyzeQuotesSafely(
      { reportSessionId: "report-4", inputs: validInputs, category: "automotive" },
      extraction,
      reasoning,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.reportSessionId).toBe("report-4");
    expect(result.report.quotes).toHaveLength(2);
    expect(result.report.quotes[0].warranty.certainty).toBe("ambiguous");
    expect(result.report.quotes[0].warranty.evidence[0]).toMatchObject({ sourceInputId: "a", sourceLabel: "Quote A" });
    expect(reasoning.analyze).toHaveBeenCalledTimes(1);
  });
});
