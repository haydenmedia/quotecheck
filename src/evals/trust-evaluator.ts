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
export interface TrustEvalFailure {
  code: string;
  message: string;
  caseId: string;
  findingId?: string;
  quoteId?: string;
}
export interface TrustEvalResult {
  caseId: string;
  expected: TrustEvalExpectation;
  actual: TrustEvalExpectation;
  matchedExpectation: boolean;
  failures: TrustEvalFailure[];
}
export interface TrustEvalSuiteResult {
  fixtureVersion: 1;
  passed: boolean;
  caseCount: number;
  matchedCount: number;
  results: TrustEvalResult[];
  summary: string;
}

const extraChargeAssertion = /\b(?:is|are|will be|would be|must be)\b.{0,40}\b(?:extra|additional|added)\s+(?:charge|fee|cost)\b/i;
const hardFailureCodes = new Set(["UNSUPPORTED_FACT", "CONTRADICTORY_EVIDENCE", "ARITHMETIC_CORRUPTION", "HIDDEN_UNCERTAINTY"]);
const stopWords = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "this", "to", "was", "were", "with", "stated", "explicitly", "finding", "grounded", "quote", "quotes"]);
const anchorGroups: readonly (readonly string[])[] = [
  ["total", "totals"],
  ["subtotal", "subtotals"],
  ["tax", "taxes"],
  ["fee", "fees", "charge", "charges", "cost", "costs"],
  ["disposal"],
  ["warranty", "warranties"],
  ["timeline", "timelines"],
  ["payment", "payments"],
  ["included", "include", "inclusion", "inclusions"],
  ["excluded", "exclude", "exclusion", "exclusions"],
  ["labour", "labor"],
  ["material", "materials"],
  ["allowance", "allowances"],
  ["vendor", "vendors"],
  ["price", "prices"],
  ["quantity", "quantities"],
  ["deposit", "deposits"],
  ["overtime"],
  ["arithmetic"]
];
const arithmeticAnchorIndex = anchorGroups.length - 1;
const arithmeticComponentAnchorIndexes = [0, 1, 2, 3] as const;

type UncertainField = { field: string; value: SourcedValue<unknown>; summaryValues: SourcedValue<unknown>[] };
type RiskConcern = "accuracy" | "scheduling" | "payment" | "warranty" | "scope" | "allowance" | "uncertainty" | "pricing_variability" | "overtime";
type NotStatedTarget = { anchorIndex: number; value: (quote: CanonicalQuote) => SourcedValue<unknown> };

const notStatedTargets: readonly NotStatedTarget[] = [
  { anchorIndex: 0, value: quote => quote.money.total },
  { anchorIndex: 1, value: quote => quote.money.subtotal },
  { anchorIndex: 2, value: quote => quote.money.tax },
  { anchorIndex: 3, value: quote => quote.money.fees },
  { anchorIndex: 5, value: quote => quote.warranty },
  { anchorIndex: 6, value: quote => quote.timeline },
  { anchorIndex: 7, value: quote => quote.paymentTerms },
  { anchorIndex: 13, value: quote => quote.vendor }
];

function sourcedValues(q: CanonicalQuote): SourcedValue<unknown>[] {
  return [
    q.vendor, q.quoteDate, q.expiryDate, q.projectDescription,
    q.money.subtotal, q.money.tax, q.money.fees, q.money.total,
    q.warranty, q.timeline, q.paymentTerms,
    ...q.allowances, ...q.inclusions, ...q.exclusions, ...q.conditions, ...q.uncertainties,
    ...q.lineItems.flatMap(i => [i.description, i.quantity, i.unit, i.labour, i.materials, i.price])
  ];
}
function allEvidence(q: CanonicalQuote): EvidenceRef[] {
  return sourcedValues(q).flatMap(v => v.evidence).concat(q.warnings.flatMap(w => w.evidence));
}
function evidenceKey(r: EvidenceRef) {
  return `${r.quoteId}|${r.sourceInputId ?? ""}|${r.sourceLabel}|${r.excerpt}`;
}
function push(failures: TrustEvalFailure[], test: TrustEvalCase, code: string, message: string, findingId?: string, quoteId?: string) {
  failures.push({ code, message, caseId: test.id, findingId, quoteId });
}
function isUncertain(v: SourcedValue<unknown>) {
  return v.certainty === "ambiguous" || v.certainty === "unreadable";
}
function evidenceOverlaps(a: EvidenceRef[], b: EvidenceRef[]) {
  const keys = new Set(a.map(evidenceKey));
  return b.some(ref => keys.has(evidenceKey(ref)));
}
function uncertainFields(q: CanonicalQuote, report: QuoteReport): UncertainField[] {
  const summary = report.quotes.find(x => x.id === q.id);
  const fields: UncertainField[] = [
    { field: "vendor", value: q.vendor, summaryValues: summary ? [summary.vendor] : [] },
    { field: "quoteDate", value: q.quoteDate, summaryValues: [] },
    { field: "expiryDate", value: q.expiryDate, summaryValues: [] },
    { field: "projectDescription", value: q.projectDescription, summaryValues: [] },
    { field: "subtotal", value: q.money.subtotal, summaryValues: [] },
    { field: "tax", value: q.money.tax, summaryValues: [] },
    { field: "fees", value: q.money.fees, summaryValues: [] },
    { field: "total", value: q.money.total, summaryValues: summary ? [summary.total] : [] },
    { field: "warranty", value: q.warranty, summaryValues: summary ? [summary.warranty] : [] },
    { field: "timeline", value: q.timeline, summaryValues: summary ? [summary.timeline] : [] },
    { field: "paymentTerms", value: q.paymentTerms, summaryValues: summary ? [summary.paymentTerms] : [] },
    ...q.allowances.map((value, i) => ({ field: `allowances[${i}]`, value, summaryValues: [] })),
    ...q.inclusions.map((value, i) => ({ field: `inclusions[${i}]`, value, summaryValues: summary ? summary.scopeIncluded : [] })),
    ...q.exclusions.map((value, i) => ({ field: `exclusions[${i}]`, value, summaryValues: summary ? summary.scopeExcluded : [] })),
    ...q.conditions.map((value, i) => ({ field: `conditions[${i}]`, value, summaryValues: [] })),
    ...q.uncertainties.map((value, i) => ({ field: `uncertainties[${i}]`, value, summaryValues: [] })),
    ...q.lineItems.flatMap((item, i) => [
      { field: `lineItems[${i}].description`, value: item.description as SourcedValue<unknown>, summaryValues: [] },
      { field: `lineItems[${i}].quantity`, value: item.quantity as SourcedValue<unknown>, summaryValues: [] },
      { field: `lineItems[${i}].unit`, value: item.unit as SourcedValue<unknown>, summaryValues: [] },
      { field: `lineItems[${i}].labour`, value: item.labour as SourcedValue<unknown>, summaryValues: [] },
      { field: `lineItems[${i}].materials`, value: item.materials as SourcedValue<unknown>, summaryValues: [] },
      { field: `lineItems[${i}].price`, value: item.price as SourcedValue<unknown>, summaryValues: [] }
    ])
  ];
  return fields.filter(field => isUncertain(field.value));
}
function uncertaintySurfaced(test: TrustEvalCase, quote: CanonicalQuote, field: UncertainField) {
  if (field.summaryValues.some(v => v.certainty === field.value.certainty && evidenceOverlaps(field.value.evidence, v.evidence))) return true;
  return test.report.findings.some(f => f.affectedQuoteIds.includes(quote.id) && f.type === "inference" && evidenceOverlaps(field.value.evidence, f.evidenceRefs));
}
function arithmeticMismatch(q: CanonicalQuote) {
  const money = q.money;
  if ([money.subtotal, money.tax, money.fees, money.total].some(v => v.certainty !== "stated" || typeof v.value !== "number")) return false;
  return Math.abs((money.subtotal.value! + money.tax.value! + money.fees.value!) - money.total.value!) > 0.01;
}
function normalizedWords(text: string) {
  return text.toLowerCase().match(/[a-z]+/g)?.filter(word => !stopWords.has(word)) ?? [];
}
function anchors(text: string) {
  const words = new Set(normalizedWords(text));
  const result = new Set<number>();
  anchorGroups.forEach((group, index) => {
    if (group.some(word => words.has(word))) result.add(index);
  });
  return result;
}
function numbers(text: string) {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map(x => Number(x.replace(/,/g, ""))).filter(Number.isFinite);
}
function arithmeticClaimSupportedByEvidence(evidenceAnchors: Set<number>, evidenceNumbers: number[]) {
  const componentCount = arithmeticComponentAnchorIndexes.filter(index => evidenceAnchors.has(index)).length;
  return componentCount >= 2 && evidenceNumbers.length >= 2;
}
function claimSupportedByEvidence(f: Finding) {
  const claim = `${f.title} ${f.plainLanguageExplanation}`;
  const evidenceText = f.evidenceRefs.map(ref => ref.excerpt).join(" ");
  const claimNumbers = numbers(claim);
  const evidenceNumbers = numbers(evidenceText);
  if (claimNumbers.some(value => !evidenceNumbers.some(candidate => Math.abs(candidate - value) < 0.0001))) return false;
  const claimAnchors = anchors(claim);
  const evidenceAnchors = anchors(evidenceText);
  for (const anchor of claimAnchors) {
    if (evidenceAnchors.has(anchor)) continue;
    if (anchor === arithmeticAnchorIndex && arithmeticClaimSupportedByEvidence(evidenceAnchors, evidenceNumbers)) continue;
    return false;
  }
  if (claimNumbers.length > 0 || claimAnchors.size > 0) return true;
  const claimWords = new Set(normalizedWords(claim).filter(word => word.length >= 4));
  const evidenceWords = new Set(normalizedWords(evidenceText).filter(word => word.length >= 4));
  return [...claimWords].some(word => evidenceWords.has(word));
}
function concernKinds(text: string): Set<RiskConcern> {
  const kinds = new Set<RiskConcern>();
  if (/\b(?:arithmetic|mismatch|inaccur(?:ate|acy)|incorrect|calculation|does\s+not\s+add\s+up|doesn't\s+add\s+up|inconsisten(?:t|cy))\b/i.test(text)) kinds.add("accuracy");
  if (/\b(?:schedul(?:e|ed|ing)|availability|timeline|delay(?:ed)?|start\s+date|completion\s+date)\b/i.test(text)) kinds.add("scheduling");
  if (/\b(?:payment|deposit|due\s+(?:on|before|after)|installment|instalment)\b/i.test(text)) kinds.add("payment");
  if (/\b(?:warranty|warranties|guarantee)\b/i.test(text)) kinds.add("warranty");
  if (/\b(?:excluded|exclusion|not\s+included|outside\s+scope|scope\s+exclusion|omission)\b/i.test(text)) kinds.add("scope");
  if (/\b(?:allowance|allowances|provisional\s+sum)\b/i.test(text)) kinds.add("allowance");
  if (/\b(?:ambiguous|unreadable|uncertain|unclear)\b/i.test(text)) kinds.add("uncertainty");
  if (/\b(?:price|cost|fee|charge|total|subtotal|tax)\b.{0,45}\b(?:change|vary|variable|increase|surcharge|additional|extra|estimated|estimate|provisional)\b|\b(?:change|vary|variable|increase|surcharge|additional|extra|estimated|estimate|provisional)\b.{0,45}\b(?:price|cost|fee|charge|total|subtotal|tax)\b/i.test(text)) kinds.add("pricing_variability");
  if (/\bovertime\b/i.test(text)) kinds.add("overtime");
  return kinds;
}
function sourcedText(v: SourcedValue<unknown>) {
  return `${typeof v.value === "string" ? v.value : ""} ${v.evidence.map(e => e.excerpt).join(" ")}`;
}
function supportedRiskConcerns(f: Finding, quoteById: Map<string, CanonicalQuote>) {
  const supported = new Set<RiskConcern>();
  for (const quoteId of f.affectedQuoteIds) {
    const quote = quoteById.get(quoteId);
    if (!quote) continue;
    const refs = f.evidenceRefs;
    for (const warning of quote.warnings) {
      if (!evidenceOverlaps(warning.evidence, refs)) continue;
      if (warning.code === "ARITHMETIC_MISMATCH") supported.add("accuracy");
      if (warning.code === "AMBIGUOUS_FIELD" || warning.code === "UNREADABLE_FIELD") supported.add("uncertainty");
    }
    for (const value of sourcedValues(quote)) if (isUncertain(value) && evidenceOverlaps(value.evidence, refs)) supported.add("uncertainty");
    for (const value of quote.conditions) {
      if (!evidenceOverlaps(value.evidence, refs)) continue;
      for (const kind of concernKinds(sourcedText(value))) supported.add(kind);
    }
    for (const value of quote.allowances) if (evidenceOverlaps(value.evidence, refs)) {
      supported.add("allowance");
      supported.add("pricing_variability");
    }
    for (const value of quote.exclusions) if (evidenceOverlaps(value.evidence, refs)) supported.add("scope");
    for (const value of quote.uncertainties) if (evidenceOverlaps(value.evidence, refs)) {
      supported.add("uncertainty");
      for (const kind of concernKinds(sourcedText(value))) supported.add(kind);
    }
  }
  return supported;
}
function riskConditionSupported(f: Finding, quoteById: Map<string, CanonicalQuote>) {
  const claimKinds = concernKinds(`${f.title} ${f.plainLanguageExplanation}`);
  if (claimKinds.size === 0) return false;
  const supported = supportedRiskConcerns(f, quoteById);
  return [...claimKinds].every(kind => supported.has(kind));
}
function notStatedSupported(f: Finding, quoteById: Map<string, CanonicalQuote>) {
  const titleTargets = notStatedTargets.filter(target => anchors(f.title).has(target.anchorIndex));
  const targets = titleTargets.length > 0
    ? titleTargets
    : notStatedTargets.filter(target => anchors(f.plainLanguageExplanation.split(/[.;]/, 1)[0]).has(target.anchorIndex));
  if (targets.length === 0 || f.affectedQuoteIds.length === 0) return false;
  return f.affectedQuoteIds.every(quoteId => {
    const quote = quoteById.get(quoteId);
    return Boolean(quote && targets.every(target => target.value(quote).certainty === "not_stated"));
  });
}
function inferenceSupported(f: Finding) {
  return f.evidenceRefs.length > 0 && claimSupportedByEvidence(f);
}

export function evaluateTrustCase(test: TrustEvalCase): TrustEvalResult {
  const failures: TrustEvalFailure[] = [];
  const quoteById = new Map(test.quotes.map(q => [q.id, q]));
  const canonicalEvidence = new Set(test.quotes.flatMap(allEvidence).map(evidenceKey));

  for (const quote of test.quotes) {
    if (arithmeticMismatch(quote) && !quote.warnings.some(w => w.code === "ARITHMETIC_MISMATCH")) {
      push(failures, test, "ARITHMETIC_CORRUPTION", "Stated subtotal + tax + fees does not equal stated total and is not surfaced as an arithmetic warning.", undefined, quote.id);
    }
    for (const field of uncertainFields(quote, test.report)) {
      if (!uncertaintySurfaced(test, quote, field)) {
        push(failures, test, "HIDDEN_UNCERTAINTY", `Extraction uncertainty in ${field.field} is not preserved with field/evidence-specific report state.`, undefined, quote.id);
      }
    }
    for (const warning of quote.warnings.filter(w => w.code === "AMBIGUOUS_FIELD" || w.code === "UNREADABLE_FIELD")) {
      const surfaced = test.report.findings.some(f => f.affectedQuoteIds.includes(quote.id) && f.type === "inference" && evidenceOverlaps(warning.evidence, f.evidenceRefs));
      if (!surfaced) push(failures, test, "HIDDEN_UNCERTAINTY", `Extraction warning ${warning.code} is not preserved with matching source evidence.`, undefined, quote.id);
    }
  }

  for (const finding of test.report.findings) {
    for (const quoteId of finding.affectedQuoteIds) {
      if (!quoteById.has(quoteId)) push(failures, test, "UNKNOWN_QUOTE", `Finding references unknown quote ${quoteId}.`, finding.id, quoteId);
    }
    for (const ref of finding.evidenceRefs) {
      if (!canonicalEvidence.has(evidenceKey(ref))) push(failures, test, "CONTRADICTORY_EVIDENCE", "Finding evidence does not exactly match canonical source evidence.", finding.id, ref.quoteId);
      if (!finding.affectedQuoteIds.includes(ref.quoteId)) push(failures, test, "CONTRADICTORY_EVIDENCE", "Finding evidence references a quote that is not listed as affected.", finding.id, ref.quoteId);
    }

    if ((finding.type === "explicit_fact" || finding.type === "difference") && finding.evidenceRefs.length === 0) {
      push(failures, test, "UNSUPPORTED_FACT", "Explicit facts and differences require canonical source evidence.", finding.id);
    }
    if ((finding.type === "explicit_fact" || finding.type === "difference") && finding.evidenceRefs.length > 0 && !claimSupportedByEvidence(finding)) {
      push(failures, test, "UNSUPPORTED_FACT", "The cited canonical evidence does not support the factual claim being asserted.", finding.id);
    }
    if (finding.type === "potential_risk" && finding.evidenceRefs.length === 0) {
      push(failures, test, "FALSE_POSITIVE_RISK", "Potential-risk findings require grounded source evidence.", finding.id);
    }
    if (finding.type === "potential_risk" && finding.evidenceRefs.length > 0 && !riskConditionSupported(finding, quoteById)) {
      push(failures, test, "FALSE_POSITIVE_RISK", "Every material concern asserted by a potential-risk finding requires compatible canonical provenance.", finding.id);
    }
    if (finding.type === "not_stated" && finding.scopeStatus === "excluded") {
      push(failures, test, "STATUS_CONFLATION", "A not-stated finding cannot be classified as explicitly excluded.", finding.id);
    }
    if (finding.type === "not_stated" && !notStatedSupported(finding, quoteById)) {
      push(failures, test, "UNSUPPORTED_NOT_STATED", "A not-stated finding must identify a canonical field that is actually not stated for every affected quote.", finding.id);
    }
    if (finding.type === "not_stated" && extraChargeAssertion.test(finding.plainLanguageExplanation)) {
      push(failures, test, "ABSENCE_AS_CHARGE", "Missing information was asserted as proof of an extra charge.", finding.id);
    }
    if (finding.type === "inference" && !inferenceSupported(finding)) {
      push(failures, test, "UNSUPPORTED_INFERENCE", "Inference findings require canonical evidence that supports the asserted inference.", finding.id);
    }
    if (finding.type === "explicit_fact" && /\b(?:extra|additional|added)\s+(?:charge|fee|cost)\b/i.test(`${finding.title} ${finding.plainLanguageExplanation}`) && finding.evidenceRefs.length === 0) {
      push(failures, test, "UNSUPPORTED_FACT", "An extra charge was asserted as fact without source evidence.", finding.id);
    }
  }

  if (test.report.noMaterialConcern && test.report.findings.some(f => f.severity === "important" || f.type === "potential_risk")) {
    push(failures, test, "INVALID_NO_CONCERN", "Report claims no material concern while material findings remain.");
  }

  const actual: TrustEvalExpectation = failures.length ? "fail" : "pass";
  const expectedCodes = new Set(test.expectedFailureCodes ?? []);
  const actualCodes = new Set(failures.map(f => f.code));
  const codesMatch = test.expected === "pass" || [...expectedCodes].every(code => actualCodes.has(code));
  return { caseId: test.id, expected: test.expected, actual, matchedExpectation: actual === test.expected && codesMatch, failures };
}

export function evaluateTrustSuite(cases: TrustEvalCase[]): TrustEvalSuiteResult {
  const results = cases.map(evaluateTrustCase);
  const matchedCount = results.filter(result => result.matchedExpectation).length;
  const hardFailures = results.flatMap(result => result.failures).filter(failure => hardFailureCodes.has(failure.code)).length;
  return {
    fixtureVersion: 1,
    passed: matchedCount === results.length,
    caseCount: results.length,
    matchedCount,
    results,
    summary: `${matchedCount}/${results.length} trust fixtures matched expected outcomes; ${hardFailures} hard-failure detections exercised.`
  };
}
