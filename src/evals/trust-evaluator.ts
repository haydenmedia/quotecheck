import type { CanonicalQuote, EvidenceRef, Finding, QuoteReport, SourcedValue } from "@/lib/types";

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
const stopWords = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "this", "to", "was", "were", "with", "stated", "explicitly", "finding", "grounded", "quote", "quotes"]);
const anchorGroups: readonly (readonly string[])[] = [
  ["total", "totals"], ["subtotal", "subtotals"], ["tax", "taxes"], ["fee", "fees", "charge", "charges", "cost", "costs"],
  ["disposal"], ["warranty", "warranties"], ["timeline", "timelines"], ["payment", "payments"], ["included", "include", "inclusion", "inclusions"],
  ["excluded", "exclude", "exclusion", "exclusions"], ["labour", "labor"], ["material", "materials"], ["allowance", "allowances"],
  ["vendor", "vendors"], ["price", "prices"], ["quantity", "quantities"], ["deposit", "deposits"], ["overtime"]
];

type UncertainField = {
  field: string;
  value: SourcedValue<unknown>;
  summaryValues: SourcedValue<unknown>[];
};

function allEvidence(quote: CanonicalQuote): EvidenceRef[] {
  const sourced = [quote.vendor, quote.quoteDate, quote.expiryDate, quote.projectDescription, quote.money.subtotal, quote.money.tax, quote.money.fees, quote.money.total, quote.warranty, quote.timeline, quote.paymentTerms];
  const arrays = [...quote.allowances, ...quote.inclusions, ...quote.exclusions, ...quote.conditions, ...quote.uncertainties];
  const line = quote.lineItems.flatMap(item => [item.description, item.quantity, item.unit, item.labour, item.materials, item.price]);
  return [...sourced, ...arrays, ...line].flatMap(value => value.evidence).concat(quote.warnings.flatMap(w => w.evidence));
}
function evidenceKey(ref: EvidenceRef): string { return `${ref.quoteId}|${ref.sourceInputId ?? ""}|${ref.sourceLabel}|${ref.excerpt}`; }
function push(failures: TrustEvalFailure[], test: TrustEvalCase, code: string, message: string, findingId?: string, quoteId?: string) { failures.push({ code, message, caseId:test.id, findingId, quoteId }); }
function isUncertain(value: SourcedValue<unknown>): boolean { return value.certainty === "ambiguous" || value.certainty === "unreadable"; }
function evidenceOverlaps(a: EvidenceRef[], b: EvidenceRef[]): boolean {
  const keys = new Set(a.map(evidenceKey));
  return b.some(ref => keys.has(evidenceKey(ref)));
}
function uncertainFields(quote: CanonicalQuote, report: QuoteReport): UncertainField[] {
  const summary = report.quotes.find(q => q.id === quote.id);
  const fields: UncertainField[] = [
    { field:"vendor", value:quote.vendor, summaryValues:summary ? [summary.vendor] : [] },
    { field:"quoteDate", value:quote.quoteDate, summaryValues:[] },
    { field:"expiryDate", value:quote.expiryDate, summaryValues:[] },
    { field:"projectDescription", value:quote.projectDescription, summaryValues:[] },
    { field:"subtotal", value:quote.money.subtotal, summaryValues:[] },
    { field:"tax", value:quote.money.tax, summaryValues:[] },
    { field:"fees", value:quote.money.fees, summaryValues:[] },
    { field:"total", value:quote.money.total, summaryValues:summary ? [summary.total] : [] },
    { field:"warranty", value:quote.warranty, summaryValues:summary ? [summary.warranty] : [] },
    { field:"timeline", value:quote.timeline, summaryValues:summary ? [summary.timeline] : [] },
    { field:"paymentTerms", value:quote.paymentTerms, summaryValues:summary ? [summary.paymentTerms] : [] },
    ...quote.allowances.map((value, i) => ({ field:`allowances[${i}]`, value, summaryValues:[] })),
    ...quote.inclusions.map((value, i) => ({ field:`inclusions[${i}]`, value, summaryValues:summary ? summary.scopeIncluded : [] })),
    ...quote.exclusions.map((value, i) => ({ field:`exclusions[${i}]`, value, summaryValues:summary ? summary.scopeExcluded : [] })),
    ...quote.conditions.map((value, i) => ({ field:`conditions[${i}]`, value, summaryValues:[] })),
    ...quote.uncertainties.map((value, i) => ({ field:`uncertainties[${i}]`, value, summaryValues:[] })),
    ...quote.lineItems.flatMap((item, i) => [
      { field:`lineItems[${i}].description`, value:item.description as SourcedValue<unknown>, summaryValues:[] },
      { field:`lineItems[${i}].quantity`, value:item.quantity as SourcedValue<unknown>, summaryValues:[] },
      { field:`lineItems[${i}].unit`, value:item.unit as SourcedValue<unknown>, summaryValues:[] },
      { field:`lineItems[${i}].labour`, value:item.labour as SourcedValue<unknown>, summaryValues:[] },
      { field:`lineItems[${i}].materials`, value:item.materials as SourcedValue<unknown>, summaryValues:[] },
      { field:`lineItems[${i}].price`, value:item.price as SourcedValue<unknown>, summaryValues:[] }
    ])
  ];
  return fields.filter(field => isUncertain(field.value));
}
function uncertaintySurfaced(test: TrustEvalCase, quote: CanonicalQuote, field: UncertainField): boolean {
  const summaryMatch = field.summaryValues.some(summaryValue => summaryValue.certainty === field.value.certainty && evidenceOverlaps(field.value.evidence, summaryValue.evidence));
  if (summaryMatch) return true;
  return test.report.findings.some(finding => finding.affectedQuoteIds.includes(quote.id) && finding.type === "inference" && evidenceOverlaps(field.value.evidence, finding.evidenceRefs));
}
function arithmeticMismatch(quote: CanonicalQuote): boolean {
  const m = quote.money;
  if ([m.subtotal, m.tax, m.fees, m.total].some(v => v.certainty !== "stated" || typeof v.value !== "number")) return false;
  return Math.abs((m.subtotal.value! + m.tax.value! + m.fees.value!) - m.total.value!) > 0.01;
}
function normalizedWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g)?.filter(word => !stopWords.has(word)) ?? [];
}
function anchors(text: string): Set<number> {
  const words = new Set(normalizedWords(text));
  const result = new Set<number>();
  anchorGroups.forEach((group, index) => { if (group.some(word => words.has(word))) result.add(index); });
  return result;
}
function numbers(text: string): number[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map(raw => Number(raw.replace(/,/g, ""))).filter(Number.isFinite);
}
function claimSupportedByEvidence(finding: Finding): boolean {
  const claim = `${finding.title} ${finding.plainLanguageExplanation}`;
  const evidenceText = finding.evidenceRefs.map(ref => ref.excerpt).join(" ");
  const claimNumbers = numbers(claim);
  const evidenceNumbers = numbers(evidenceText);
  if (claimNumbers.some(value => !evidenceNumbers.some(candidate => Math.abs(candidate - value) < 0.0001))) return false;

  const claimAnchors = anchors(claim);
  const evidenceAnchors = anchors(evidenceText);
  if ([...claimAnchors].some(anchor => !evidenceAnchors.has(anchor))) return false;

  if (claimNumbers.length > 0 || claimAnchors.size > 0) return true;
  const claimWords = new Set(normalizedWords(claim).filter(word => word.length >= 4));
  const evidenceWords = new Set(normalizedWords(evidenceText).filter(word => word.length >= 4));
  return [...claimWords].some(word => evidenceWords.has(word));
}

export function evaluateTrustCase(test: TrustEvalCase): TrustEvalResult {
  const failures: TrustEvalFailure[] = [];
  const quoteById = new Map(test.quotes.map(q => [q.id, q]));
  const evidence = new Set(test.quotes.flatMap(allEvidence).map(evidenceKey));

  for (const quote of test.quotes) {
    if (arithmeticMismatch(quote) && !quote.warnings.some(w => w.code === "ARITHMETIC_MISMATCH")) push(failures, test, "ARITHMETIC_CORRUPTION", "Stated subtotal + tax + fees does not equal stated total and is not surfaced as an arithmetic warning.", undefined, quote.id);
    for (const field of uncertainFields(quote, test.report)) {
      if (!uncertaintySurfaced(test, quote, field)) push(failures, test, "HIDDEN_UNCERTAINTY", `Extraction uncertainty in ${field.field} is not preserved with field/evidence-specific report state.`, undefined, quote.id);
    }
    for (const warning of quote.warnings.filter(w => w.code === "AMBIGUOUS_FIELD" || w.code === "UNREADABLE_FIELD")) {
      const surfaced = test.report.findings.some(finding => finding.affectedQuoteIds.includes(quote.id) && finding.type === "inference" && evidenceOverlaps(warning.evidence, finding.evidenceRefs));
      if (!surfaced) push(failures, test, "HIDDEN_UNCERTAINTY", `Extraction warning ${warning.code} is not preserved with matching source evidence.`, undefined, quote.id);
    }
  }

  for (const finding of test.report.findings) {
    for (const quoteId of finding.affectedQuoteIds) if (!quoteById.has(quoteId)) push(failures, test, "UNKNOWN_QUOTE", `Finding references unknown quote ${quoteId}.`, finding.id, quoteId);
    for (const ref of finding.evidenceRefs) {
      if (!evidence.has(evidenceKey(ref))) push(failures, test, "CONTRADICTORY_EVIDENCE", "Finding evidence does not exactly match canonical source evidence.", finding.id, ref.quoteId);
      if (!finding.affectedQuoteIds.includes(ref.quoteId)) push(failures, test, "CONTRADICTORY_EVIDENCE", "Finding evidence references a quote that is not listed as affected.", finding.id, ref.quoteId);
    }

    if ((finding.type === "explicit_fact" || finding.type === "difference") && finding.evidenceRefs.length === 0) push(failures, test, "UNSUPPORTED_FACT", "Explicit facts and differences require canonical source evidence.", finding.id);
    if ((finding.type === "explicit_fact" || finding.type === "difference") && finding.evidenceRefs.length > 0 && !claimSupportedByEvidence(finding)) push(failures, test, "UNSUPPORTED_FACT", "The cited canonical evidence does not support the factual claim being asserted.", finding.id);
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
