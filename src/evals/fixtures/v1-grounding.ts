import type { CanonicalQuote, EvidenceRef, Finding, QuoteReport, SourcedValue } from "@/lib/types";
import type { TrustEvalCase } from "../trust-evaluator";

const ev = (quoteId: string, excerpt: string): EvidenceRef => ({ quoteId, sourceInputId: `input-${quoteId}`, sourceLabel: "grounding-fixture.txt", excerpt, confidence: 1 });
const stated = <T>(value: T, evidence: EvidenceRef[] = []): SourcedValue<T> => ({ value, certainty: "stated", evidence });
const missing = <T>(): SourcedValue<T> => ({ value: null, certainty: "not_stated", evidence: [] });

function quote(id: string, warranty: SourcedValue<string>): CanonicalQuote {
  return {
    id,
    sourceInputIds: [`input-${id}`],
    vendor: stated(`Vendor ${id}`, [ev(id, `Vendor ${id}`)]),
    quoteDate: missing(),
    expiryDate: missing(),
    projectDescription: stated("Standard project", [ev(id, "Standard project")]),
    lineItems: [],
    money: {
      subtotal: stated(1000, [ev(id, "Subtotal $1000.00")]),
      tax: stated(0, [ev(id, "Tax $0.00")]),
      fees: stated(0, [ev(id, "Fees $0.00")]),
      total: stated(1000, [ev(id, "Total $1000.00")])
    },
    allowances: [],
    inclusions: [],
    exclusions: [],
    warranty,
    timeline: stated("2 weeks", [ev(id, "Timeline: 2 weeks")]),
    paymentTerms: stated("Due on completion", [ev(id, "Due on completion")]),
    conditions: [],
    uncertainties: [],
    warnings: []
  };
}

function finding(id: string, type: Finding["type"], quoteId: string, evidenceRefs: EvidenceRef[], explanation: string): Finding {
  return { id, type, severity: "attention", title: id, plainLanguageExplanation: explanation, affectedQuoteIds: [quoteId], evidenceRefs, confidence: 0.95, questionsToAsk: [] };
}

function report(q: CanonicalQuote, findings: Finding[]): QuoteReport {
  return {
    category: "general",
    quotes: [{ id: q.id, vendor: q.vendor, total: q.money.total, scopeIncluded: q.inclusions, scopeExcluded: q.exclusions, warranty: q.warranty, timeline: q.timeline, paymentTerms: q.paymentTerms }],
    findings,
    sections: [],
    overallGutCheck: "Review grounded findings.",
    confidenceLimitations: ["Findings are limited to supplied quote evidence."],
    noMaterialConcern: false
  };
}

const statedWarranty = quote("stated-warranty", stated("1 year", [ev("stated-warranty", "Warranty: 1 year")]));
const missingWarranty = quote("missing-warranty", missing());
const inferenceQuote = quote("grounded-inference", stated("1 year", [ev("grounded-inference", "Warranty: 1 year")]));
const unsupportedInferenceQuote = quote("unsupported-inference", stated("1 year", [ev("unsupported-inference", "Warranty: 1 year")]));

export const trustEvalGroundingFixturesV1: TrustEvalCase[] = [
  {
    id: "contradictory-not-stated-rejected",
    description: "A stated warranty cannot be reported as not stated.",
    fixtureVersion: 1,
    quotes: [statedWarranty],
    report: report(statedWarranty, [finding("warranty-not-stated", "not_stated", statedWarranty.id, [], "Warranty is not stated.")]),
    expected: "fail",
    expectedFailureCodes: ["UNSUPPORTED_NOT_STATED"]
  },
  {
    id: "genuine-not-stated-accepted",
    description: "A genuinely absent warranty can be reported as not stated without inventing a consequence.",
    fixtureVersion: 1,
    quotes: [missingWarranty],
    report: report(missingWarranty, [finding("warranty-not-stated", "not_stated", missingWarranty.id, [], "Warranty is not stated.")]),
    expected: "pass"
  },
  {
    id: "unsupported-inference-rejected",
    description: "An inference without canonical source provenance fails deterministically.",
    fixtureVersion: 1,
    quotes: [unsupportedInferenceQuote],
    report: report(unsupportedInferenceQuote, [finding("vendor-unreliable", "inference", unsupportedInferenceQuote.id, [], "The vendor appears unreliable.")]),
    expected: "fail",
    expectedFailureCodes: ["UNSUPPORTED_INFERENCE"]
  },
  {
    id: "grounded-inference-accepted",
    description: "An inference is permitted when its assertion is grounded in matching canonical evidence.",
    fixtureVersion: 1,
    quotes: [inferenceQuote],
    report: report(inferenceQuote, [finding("warranty-confirmation", "inference", inferenceQuote.id, inferenceQuote.warranty.evidence, "Warranty wording should be confirmed.")]),
    expected: "pass"
  }
];
