import type { CanonicalQuote, EvidenceRef, Finding, QuoteReport } from "@/lib/types";

export type TrustEvalExpectation = "pass" | "fail";
export interface TrustEvalCase {
  id: string;
  description: string;
  fixtureVersion: 1;
  quotes: CanonicalQuote[];
  report: QuoteReport;
  expected: TrustEvalExpectation;
  expectedFailureCodes?: string[];
}
export interface TrustEvalFailure { code: string; message: string; caseId: string; findingId?: string; quoteId?: string; }
export interface TrustEvalResult { caseId: string; expected: TrustEvalExpectation; actual: TrustEvalExpectation; matchedExpectation: boolean; failures: TrustEvalFailure[]; }
export interface TrustEvalSuiteResult { fixtureVersion: 1; passed: boolean; caseCount: number; matchedCount: number; results: TrustEvalResult[]; summary: string; }

const extraChargeAssertion = /\b(?:is|are|will be|would be|must be)\b.{0,40}\b(?:extra|additional|added)\s+(?:charge|fee|cost)\b/i;
const hardFailureCodes = new Set(["UNSUPPORTED_FACT", "CONTRADICTORY_EVIDENCE", "ARITHMETIC_CORRUPTION", "HIDDEN_UNCERTAINTY"]);

function allEvidence(quote: CanonicalQuote): EvidenceRef[] {
  const sourced = [quote.vendor, quote.quoteDate, quote.expiryDate, quote.projectDescription, quote.money.subtotal, quote.money.tax, quote.money.fees, quote.money.total, quote.warranty, quote.timeline, quote.paymentTerms];
  const arrays = [...quote.allowances, ...quote.inclusions, ...quote.exclusions, ...quote.conditions, ...quote.uncertainties];
  const line = quote.lineItems.flatMap(item => [item.description, item.quantity, item.unit, item.labour, item.materials, item.price]);
  return [...sourced, ...arrays, ...line].flatMap(value => value.evidence).concat(quote.warnings.flatMap(w => w.evidence));
}
function evidenceKey(ref: EvidenceRef): string { return `${ref.quoteId}|${ref.sourceInputId ?? ""}|${ref.sourceLabel}|${ref.excerpt}`; }
function push(failures: TrustEvalFailure[], test: TrustEvalCase, code: string, message: string, findingId?: string, quoteId?: string) { failures.push({ code, message, caseId:test.id, findingId, quoteId }); }
function hasUncertainty(quote: CanonicalQuote): boolean {
  const values = [quote.vendor, quote.quoteDate, quote.expiryDate, quote.projectDescription, quote.money.subtotal, quote.money.tax, quote.money.fees, quote.money.total, quote.warranty, quote.timeline, quote.paymentTerms, ...quote.allowances, ...quote.inclusions, ...quote.exclusions, ...quote.conditions, ...quote.uncertainties];
  return values.some(v => v.certainty === "ambiguous" || v.certainty === "unreadable") || quote.warnings.some(w => w.code === "AMBIGUOUS_FIELD" || w.code === "UNREADABLE_FIELD");
}
function arithmeticMismatch(quote: CanonicalQuote): boolean {
  const m = quote.money;
  if ([m.subtotal, m.tax, m.fees, m.total].some(v => v.certainty !== "stated" || typeof v.value !== "number")) return false;
  return Math.abs((m.subtotal.value! + m.tax.value! + m.fees.value!) - m.total.value!) > 0.01;
}

export function evaluateTrustCase(test: TrustEvalCase): TrustEvalResult {
  const failures: TrustEvalFailure[] = [];
  const quoteById = new Map(test.quotes.map(q => [q.id, q]));
  const evidence = new Set(test.quotes.flatMap(allEvidence).map(evidenceKey));

  for (const quote of test.quotes) {
    if (arithmeticMismatch(quote) && !quote.warnings.some(w => w.code === "ARITHMETIC_MISMATCH")) push(failures, test, "ARITHMETIC_CORRUPTION", "Stated subtotal + tax + fees does not equal stated total and is not surfaced as an arithmetic warning.", undefined, quote.id);
    if (hasUncertainty(quote)) {
      const surfaced = test.report.findings.some(f => f.affectedQuoteIds.includes(quote.id) && f.type === "inference" && f.evidenceRefs.length > 0) || test.report.confidenceLimitations.some(x => x.toLowerCase().includes("uncertain"));
      if (!surfaced) push(failures, test, "HIDDEN_UNCERTAINTY", "Extraction uncertainty exists but the report does not preserve it.", undefined, quote.id);
    }
  }

  for (const finding of test.report.findings) {
    for (const quoteId of finding.affectedQuoteIds) if (!quoteById.has(quoteId)) push(failures, test, "UNKNOWN_QUOTE", `Finding references unknown quote ${quoteId}.`, finding.id, quoteId);
    for (const ref of finding.evidenceRefs) if (!evidence.has(evidenceKey(ref))) push(failures, test, "CONTRADICTORY_EVIDENCE", "Finding evidence does not exactly match canonical source evidence.", finding.id, ref.quoteId);

    if ((finding.type === "explicit_fact" || finding.type === "difference") && finding.evidenceRefs.length === 0) push(failures, test, "UNSUPPORTED_FACT", "Explicit facts and differences require canonical source evidence.", finding.id);
    if (finding.type === "potential_risk" && finding.evidenceRefs.length === 0) push(failures, test, "FALSE_POSITIVE_RISK", "Potential-risk findings require grounded source evidence.", finding.id);
    if (finding.type === "not_stated" && finding.scopeStatus === "excluded") push(failures, test, "STATUS_CONFLATION", "A not-stated finding cannot be classified as explicitly excluded.", finding.id);
    if (finding.type === "not_stated" && extraChargeAssertion.test(finding.plainLanguageExplanation)) push(failures, test, "ABSENCE_AS_CHARGE", "Missing information was asserted as proof of an extra charge.", finding.id);
    if (finding.type === "explicit_fact" && /\b(?:extra|additional|added)\s+(?:charge|fee|cost)\b/i.test(`${finding.title} ${finding.plainLanguageExplanation}`) && finding.evidenceRefs.length === 0) push(failures, test, "UNSUPPORTED_FACT", "An extra charge was asserted as fact without source evidence.", finding.id);
  }

  if (test.report.noMaterialConcern) {
    const material = test.report.findings.some(f => f.severity === "important" || f.type === "potential_risk");
    if (material) push(failures, test, "INVALID_NO_CONCERN", "Report claims no material concern while material findings remain.");
  }

  const actual: TrustEvalExpectation = failures.length ? "fail" : "pass";
  const expectedCodes = new Set(test.expectedFailureCodes ?? []);
  const actualCodes = new Set(failures.map(f => f.code));
  const codesMatch = test.expected === "pass" || [...expectedCodes].every(code => actualCodes.has(code));
  return { caseId:test.id, expected:test.expected, actual, matchedExpectation:actual === test.expected && codesMatch, failures };
}

export function evaluateTrustSuite(cases: TrustEvalCase[]): TrustEvalSuiteResult {
  const results = cases.map(evaluateTrustCase);
  const matchedCount = results.filter(r => r.matchedExpectation).length;
  const hardFailures = results.flatMap(r => r.failures).filter(f => hardFailureCodes.has(f.code)).length;
  return { fixtureVersion:1, passed:matchedCount === results.length, caseCount:results.length, matchedCount, results, summary:`${matchedCount}/${results.length} trust fixtures matched expected outcomes; ${hardFailures} hard-failure detections exercised.` };
}
