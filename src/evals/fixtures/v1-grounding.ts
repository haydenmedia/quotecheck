import type { CanonicalQuote, EvidenceRef, Finding, InferenceBasis, QuoteReport, SourcedValue } from "@/lib/types";
import type { TrustEvalCase } from "../trust-evaluator";

const ev = (quoteId: string, excerpt: string): EvidenceRef => ({ quoteId, sourceInputId: `input-${quoteId}`, sourceLabel: "grounding-fixture.txt", excerpt, confidence: 1 });
const stated = <T>(value: T, evidence: EvidenceRef[] = []): SourcedValue<T> => ({ value, certainty: "stated", evidence });
const ambiguous = <T>(value: T, evidence: EvidenceRef[]): SourcedValue<T> => ({ value, certainty: "ambiguous", evidence });
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
    money: { subtotal: stated(1000, [ev(id, "Subtotal $1000.00")]), tax: stated(0, [ev(id, "Tax $0.00")]), fees: stated(0, [ev(id, "Fees $0.00")]), total: stated(1000, [ev(id, "Total $1000.00")]) },
    allowances: [], inclusions: [], exclusions: [], warranty,
    timeline: stated("2 weeks", [ev(id, "Timeline: 2 weeks")]),
    paymentTerms: stated("Due on completion", [ev(id, "Due on completion")]),
    conditions: [], uncertainties: [], warnings: []
  };
}
function finding(id: string, type: Finding["type"], quoteId: string, evidenceRefs: EvidenceRef[], explanation: string, inferenceBasis?: InferenceBasis[]): Finding {
  return { id, type, severity: "attention", title: id, plainLanguageExplanation: explanation, affectedQuoteIds: [quoteId], evidenceRefs, confidence: 0.95, questionsToAsk: [], inferenceBasis };
}
function report(q: CanonicalQuote, findings: Finding[]): QuoteReport {
  return { category: "general", quotes: [{ id: q.id, vendor: q.vendor, total: q.money.total, scopeIncluded: q.inclusions, scopeExcluded: q.exclusions, warranty: q.warranty, timeline: q.timeline, paymentTerms: q.paymentTerms }], findings, sections: [], overallGutCheck: "Review grounded findings.", confidenceLimitations: ["Findings are limited to supplied quote evidence."], noMaterialConcern: false };
}

const statedWarranty = quote("stated-warranty", stated("1 year", [ev("stated-warranty", "Warranty: 1 year")]));
const missingWarranty = quote("missing-warranty", missing());
const unsupportedInferenceQuote = quote("unsupported-inference", stated("1 year", [ev("unsupported-inference", "Warranty: 1 year")]));

const scheduleQuote = quote("schedule-condition", stated("1 year", [ev("schedule-condition", "Warranty: 1 year")]));
const scheduleEvidence = ev("schedule-condition", "Start date subject to scheduling availability");
scheduleQuote.conditions = [stated("Start date subject to scheduling availability", [scheduleEvidence])];

const warrantyUncertaintyEvidence = ev("warranty-uncertainty", "Warranty appears to read 1 or 7 years");
const warrantyUncertaintyQuote = quote("warranty-uncertainty", ambiguous("1 or 7 years", [warrantyUncertaintyEvidence]));

export const trustEvalGroundingFixturesV1: TrustEvalCase[] = [
  { id: "contradictory-not-stated-rejected", description: "A stated warranty cannot be reported as not stated.", fixtureVersion: 1, quotes: [statedWarranty], report: report(statedWarranty, [finding("warranty-not-stated", "not_stated", statedWarranty.id, [], "Warranty is not stated.")]), expected: "fail", expectedFailureCodes: ["UNSUPPORTED_NOT_STATED"] },
  { id: "genuine-not-stated-accepted", description: "A genuinely absent warranty can be reported as not stated without inventing a consequence.", fixtureVersion: 1, quotes: [missingWarranty], report: report(missingWarranty, [finding("warranty-not-stated", "not_stated", missingWarranty.id, [], "Warranty is not stated.")]), expected: "pass" },
  { id: "unsupported-inference-rejected", description: "Same-topic canonical evidence cannot license an unsupported qualitative inference.", fixtureVersion: 1, quotes: [unsupportedInferenceQuote], report: report(unsupportedInferenceQuote, [finding("vendor-unreliable", "inference", unsupportedInferenceQuote.id, unsupportedInferenceQuote.vendor.evidence, "Vendor unsupported-inference appears unreliable.")]), expected: "fail", expectedFailureCodes: ["UNSUPPORTED_INFERENCE"] },
  { id: "condition-vendor-qualitative-rejected", description: "A scheduling condition cannot ground an unrelated qualitative vendor inference even with exact canonical condition evidence.", fixtureVersion: 1, quotes: [scheduleQuote], report: report(scheduleQuote, [finding("vendor-unreliable-from-schedule", "inference", scheduleQuote.id, [scheduleEvidence], "Vendor schedule-condition appears unreliable.", [{ kind: "condition", subject: "vendor", interpretation: "contingent", evidenceRefs: [scheduleEvidence] }])]), expected: "fail", expectedFailureCodes: ["UNSUPPORTED_INFERENCE"] },
  { id: "condition-scheduling-inference-accepted", description: "A scheduling condition may ground a timeline contingency inference through the structured proposition contract.", fixtureVersion: 1, quotes: [scheduleQuote], report: report(scheduleQuote, [finding("timeline-contingent", "inference", scheduleQuote.id, [scheduleEvidence], "The start timing is contingent on scheduling availability.", [{ kind: "condition", subject: "timeline", interpretation: "contingent", evidenceRefs: [scheduleEvidence] }])]), expected: "pass" },
  { id: "unrelated-uncertainty-vendor-inference-rejected", description: "Warranty uncertainty cannot ground an unrelated vendor qualitative inference.", fixtureVersion: 1, quotes: [warrantyUncertaintyQuote], report: report(warrantyUncertaintyQuote, [finding("vendor-unreliable-from-warranty", "inference", warrantyUncertaintyQuote.id, [warrantyUncertaintyEvidence], "Vendor reliability is uncertain.", [{ kind: "uncertainty", subject: "vendor", interpretation: "value_uncertain", evidenceRefs: [warrantyUncertaintyEvidence] }])]), expected: "fail", expectedFailureCodes: ["UNSUPPORTED_INFERENCE"] },
  { id: "field-compatible-uncertainty-inference-accepted", description: "Uncertainty evidence may ground a clarification inference only for the matching canonical subject.", fixtureVersion: 1, quotes: [warrantyUncertaintyQuote], report: report(warrantyUncertaintyQuote, [finding("warranty-confirmation", "inference", warrantyUncertaintyQuote.id, [warrantyUncertaintyEvidence], "Warranty wording should be confirmed because the source is ambiguous.", [{ kind: "uncertainty", subject: "warranty", interpretation: "needs_clarification", evidenceRefs: [warrantyUncertaintyEvidence] }])]), expected: "pass" }
];
