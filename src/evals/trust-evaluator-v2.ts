import type { CanonicalQuote, EvidenceRef, Finding, InferenceProposition } from "@/lib/types";
import {
  evaluateTrustCase as evaluateBaselineCase,
  type TrustEvalCase,
  type TrustEvalFailure,
  type TrustEvalResult,
  type TrustEvalSuiteResult,
} from "./trust-evaluator";

const evidenceKey = (ref: EvidenceRef) => `${ref.quoteId}|${ref.sourceInputId ?? ""}|${ref.sourceLabel}|${ref.excerpt}`;

function sameEvidenceSet(a: EvidenceRef[], b: EvidenceRef[]) {
  const left = new Set(a.map(evidenceKey));
  const right = new Set(b.map(evidenceKey));
  return left.size === right.size && [...left].every(key => right.has(key));
}

export function renderInferenceProposition(proposition: InferenceProposition) {
  switch (proposition.kind) {
    case "warranty_needs_clarification":
      return { title: "warranty-uncertain", explanation: "Warranty text is ambiguous and should be confirmed." };
    case "timeline_contingent":
      return { title: "timeline-contingent", explanation: "The start timing is contingent on scheduling availability." };
  }
}

function propositionGrounded(proposition: InferenceProposition, finding: Finding, quotes: Map<string, CanonicalQuote>) {
  if (!proposition.evidenceRefs.length || !sameEvidenceSet(proposition.evidenceRefs, finding.evidenceRefs)) return false;
  if (!proposition.evidenceRefs.every(ref => finding.affectedQuoteIds.includes(ref.quoteId))) return false;

  if (proposition.kind === "warranty_needs_clarification") {
    return proposition.evidenceRefs.every(ref => {
      const quote = quotes.get(ref.quoteId);
      if (!quote || (quote.warranty.certainty !== "ambiguous" && quote.warranty.certainty !== "unreadable")) return false;
      return quote.warranty.evidence.some(canonical => evidenceKey(canonical) === evidenceKey(ref));
    });
  }

  return proposition.evidenceRefs.every(ref => {
    const quote = quotes.get(ref.quoteId);
    if (!quote) return false;
    return (quote.typedConditions ?? []).some(condition =>
      condition.subject === "timeline" && condition.value.evidence.some(canonical => evidenceKey(canonical) === evidenceKey(ref))
    );
  });
}

function structuralInferenceFailure(test: TrustEvalCase, finding: Finding, quotes: Map<string, CanonicalQuote>): TrustEvalFailure | null {
  if (finding.type !== "inference") return null;
  const proposition = finding.inferenceProposition;
  if (!proposition) {
    return { code: "UNSUPPORTED_INFERENCE", message: "Inference findings require a closed structured proposition.", caseId: test.id, findingId: finding.id };
  }
  const rendered = renderInferenceProposition(proposition);
  if (finding.title !== rendered.title || finding.plainLanguageExplanation !== rendered.explanation) {
    return { code: "UNSUPPORTED_INFERENCE", message: "Inference prose must exactly match deterministic renderer output.", caseId: test.id, findingId: finding.id };
  }
  if (!propositionGrounded(proposition, finding, quotes)) {
    return { code: "UNSUPPORTED_INFERENCE", message: "Inference proposition provenance must resolve to a canonical typed node for the same subject.", caseId: test.id, findingId: finding.id };
  }
  return null;
}

export function evaluateTrustCase(test: TrustEvalCase): TrustEvalResult {
  const baseline = evaluateBaselineCase(test);
  const quotes = new Map(test.quotes.map(quote => [quote.id, quote]));
  const structuralFailures = test.report.findings.map(finding => structuralInferenceFailure(test, finding, quotes)).filter((failure): failure is TrustEvalFailure => Boolean(failure));
  const failures = [...baseline.failures];
  for (const failure of structuralFailures) {
    if (!failures.some(existing => existing.code === failure.code && existing.findingId === failure.findingId && existing.message === failure.message)) failures.push(failure);
  }
  const actual = failures.length ? "fail" : "pass";
  const expectedCodes = new Set(test.expectedFailureCodes ?? []);
  const actualCodes = new Set(failures.map(failure => failure.code));
  const codesMatch = test.expected === "pass" || [...expectedCodes].every(code => actualCodes.has(code));
  return { ...baseline, actual, failures, matchedExpectation: actual === test.expected && codesMatch };
}

export function evaluateTrustSuite(cases: TrustEvalCase[]): TrustEvalSuiteResult {
  const results = cases.map(evaluateTrustCase);
  const matchedCount = results.filter(result => result.matchedExpectation).length;
  const hardFailureCodes = new Set(["UNSUPPORTED_FACT", "CONTRADICTORY_EVIDENCE", "ARITHMETIC_CORRUPTION", "HIDDEN_UNCERTAINTY"]);
  const hardFailures = results.flatMap(result => result.failures).filter(failure => hardFailureCodes.has(failure.code)).length;
  return {
    fixtureVersion: 1,
    passed: matchedCount === results.length,
    caseCount: results.length,
    matchedCount,
    results,
    summary: `${matchedCount}/${results.length} trust fixtures matched expected outcomes; ${hardFailures} hard-failure detections exercised.`,
  };
}
