import { describe, expect, it, vi } from "vitest";
import { analyzeQuotesWithPrivateBetaInstrumentation } from "../src/lib/instrumented-analysis";
import { DeterministicTextExtractionProvider } from "../src/lib/ingestion";
import {
  LocalPrivateBetaInstrumentation,
  PRIVATE_BETA_EVENT_NAMES,
  PRIVATE_BETA_EVENT_VERSION,
  isPrivateBetaEvent,
  recordPrivateBetaEvent,
} from "../src/lib/private-beta-instrumentation";
import type { CanonicalQuote, QuoteReport, ReasoningProvider, TextIngestionInput } from "../src/lib/types";

const validInputs: TextIngestionInput[] = [
  { id: "a", label: "Quote A", kind: "pasted_text", text: "Vendor: Alpha Auto\nTotal: $1200" },
  { id: "b", label: "Quote B", kind: "pasted_text", text: "Vendor: Beta Auto\nTotal: $1350" },
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

function reasoningProvider(): ReasoningProvider {
  return { analyze: vi.fn(async ({ quotes }) => reportFor(quotes)) };
}

describe("private beta instrumentation contract", () => {
  it("defines only the bounded golden-journey event names", () => {
    expect(PRIVATE_BETA_EVENT_NAMES).toEqual([
      "comparison_started",
      "quote_input_accepted",
      "quote_input_rejected",
      "analysis_succeeded",
      "analysis_failed",
      "preview_viewed",
      "unlock_intent",
      "unlock_succeeded",
      "unlock_failed",
      "full_report_viewed",
    ]);
  });

  it("rejects payloads containing quote content, identity, session, payment, or provider fields", () => {
    const forbidden = [
      ["rawQuoteText", "Vendor: Secret"],
      ["evidenceExcerpt", "Total: $1200"],
      ["vendorName", "Alpha Auto"],
      ["customerName", "Jane Doe"],
      ["reportBody", "full report"],
      ["paymentDetails", "4111111111111111"],
      ["provider", "example-provider"],
      ["model", "example-model"],
      ["secret", "sk-example"],
      ["reportSessionId", "session-123"],
    ] as const;

    for (const [key, value] of forbidden) {
      expect(isPrivateBetaEvent({
        version: PRIVATE_BETA_EVENT_VERSION,
        name: "preview_viewed",
        [key]: value,
      })).toBe(false);
    }
  });

  it("stores only validated bounded metadata in the deterministic local recorder", () => {
    const recorder = new LocalPrivateBetaInstrumentation();
    recordPrivateBetaEvent(recorder, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "comparison_started",
      quoteCount: 2,
      category: "Automotive",
    });
    recordPrivateBetaEvent(recorder, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "quote_input_accepted",
      ordinal: 1,
      inputKind: "pasted_text",
    });

    expect(recorder.events).toEqual([
      { version: 1, name: "comparison_started", quoteCount: 2, category: "Automotive" },
      { version: 1, name: "quote_input_accepted", ordinal: 1, inputKind: "pasted_text" },
    ]);
  });

  it("emits bounded success-path funnel events without source content or session identity", async () => {
    const recorder = new LocalPrivateBetaInstrumentation();
    const result = await analyzeQuotesWithPrivateBetaInstrumentation(
      { reportSessionId: "private-session-that-must-not-leak", inputs: validInputs, category: "automotive" },
      new DeterministicTextExtractionProvider(),
      reasoningProvider(),
      recorder,
    );

    expect(result.ok).toBe(true);
    expect(recorder.events.map((event) => event.name)).toEqual([
      "comparison_started",
      "quote_input_accepted",
      "quote_input_accepted",
      "analysis_succeeded",
    ]);
    const serialized = JSON.stringify(recorder.events);
    expect(serialized).not.toContain("private-session-that-must-not-leak");
    expect(serialized).not.toContain("Alpha Auto");
    expect(serialized).not.toContain("Beta Auto");
    expect(serialized).not.toContain("Total: $1200");
  });

  it("emits bounded rejection and analysis-failure metadata for invalid input without invoking providers", async () => {
    const recorder = new LocalPrivateBetaInstrumentation();
    const extraction = { extract: vi.fn() };
    const reasoning = { analyze: vi.fn() };
    const request = {
      reportSessionId: "private-session-that-must-not-leak",
      inputs: null,
      category: "automotive",
    } as unknown as Parameters<typeof analyzeQuotesWithPrivateBetaInstrumentation>[0];

    const result = await analyzeQuotesWithPrivateBetaInstrumentation(
      request,
      extraction as never,
      reasoning as never,
      recorder,
    );

    expect(result).toMatchObject({ ok: false, error: { code: "MALFORMED_INPUT" } });
    expect(extraction.extract).not.toHaveBeenCalled();
    expect(reasoning.analyze).not.toHaveBeenCalled();
    expect(recorder.events).toEqual([
      { version: 1, name: "comparison_started", quoteCount: 0, category: "Automotive" },
      { version: 1, name: "quote_input_rejected", inputKind: "unknown", reason: "MALFORMED_INPUT" },
      { version: 1, name: "analysis_failed", quoteCount: 0, category: "Automotive", reason: "MALFORMED_INPUT" },
    ]);
  });
});
