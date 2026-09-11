import type { CanonicalQuote, EvidenceRef, Finding, QuoteReport, ReasoningContext, ReasoningProvider, ReasoningRequest, ReportSummaryValue } from "@/lib/types";

function statedText(value: { value: string | null; certainty: string }): string | null {
  return value.certainty === "stated" && value.value ? value.value : null;
}
function statedNumber(value: { value: number | null; certainty: string }): number | null {
  return value.certainty === "stated" && typeof value.value === "number" ? value.value : null;
}
function summaryValue<T>(value: ReportSummaryValue<T>): ReportSummaryValue<T> {
  return { value: value.value, certainty: value.certainty, evidence: value.evidence };
}
function summaryValues<T>(values: ReportSummaryValue<T>[]): ReportSummaryValue<T>[] {
  return values.map(summaryValue);
}
function unique<T>(items: T[]): T[] { return [...new Set(items)]; }
function makeFinding(partial: Omit<Finding, "confidence" | "questionsToAsk"> & { confidence?: number; questionsToAsk?: string[] }): Finding {
  return { ...partial, confidence: partial.confidence ?? 0.95, questionsToAsk: partial.questionsToAsk ?? [] };
}

export function formatQuoteTotal(total: ReportSummaryValue<number>): string {
  if (total.certainty === "stated" && typeof total.value === "number") return `$${total.value.toFixed(2)}`;
  if (total.certainty === "ambiguous") return total.value === null ? "Source total is ambiguous" : `Ambiguous: $${total.value.toFixed(2)}`;
  if (total.certainty === "unreadable") return "Could not reliably read the total";
  return "Not stated";
}

export class DeterministicReasoningProvider implements ReasoningProvider {
  async analyze(input: ReasoningRequest): Promise<QuoteReport> { return analyzeQuotes(input); }
}

export function analyzeQuotes(input: { quotes: CanonicalQuote[]; category: ReasoningRequest["category"]; domain: ReasoningContext }): QuoteReport {
  const { quotes, category, domain } = input;
  const findings: Finding[] = [];

  for (const quote of quotes) {
    const vendor = statedText(quote.vendor) ?? quote.id;
    const total = statedNumber(quote.money.total);
    if (total !== null) findings.push(makeFinding({ id:`fact-total-${quote.id}`, type:"explicit_fact", severity:"info", title:`${vendor} states a total of $${total.toFixed(2)}`, plainLanguageExplanation:"This total is stated in the supplied quote.", affectedQuoteIds:[quote.id], evidenceRefs:quote.money.total.evidence }));

    for (const warning of quote.warnings) findings.push(makeFinding({ id:`warning-${quote.id}-${warning.code}`, type:warning.code === "ARITHMETIC_MISMATCH" ? "potential_risk" : "inference", severity:"attention", title:warning.code === "ARITHMETIC_MISMATCH" ? "Quoted arithmetic needs clarification" : "Source uncertainty needs clarification", plainLanguageExplanation:warning.message, affectedQuoteIds:[quote.id], evidenceRefs:warning.evidence, confidence:0.9, questionsToAsk:["Can the vendor confirm the quoted figures or wording?"] }));

    quote.exclusions.forEach((exclusion, index) => {
      if (exclusion.certainty === "stated" && exclusion.value) findings.push(makeFinding({ id:`exclusion-${quote.id}-${index}`, type:"explicit_fact", severity:"attention", title:`${vendor} explicitly excludes ${exclusion.value}`, plainLanguageExplanation:"This is an explicit exclusion in the quote; it is not merely missing information.", affectedQuoteIds:[quote.id], evidenceRefs:exclusion.evidence, questionsToAsk:[`Who is responsible for ${exclusion.value}?`] }));
    });

    const fields = [["warranty", quote.warranty], ["timeline", quote.timeline], ["payment terms", quote.paymentTerms]] as const;
    for (const [label, value] of fields) {
      if (value.certainty === "not_stated") findings.push(makeFinding({ id:`not-stated-${quote.id}-${label.replaceAll(" ", "-")}`, type:"not_stated", severity:"attention", title:`${label[0].toUpperCase()}${label.slice(1)} not stated by ${vendor}`, plainLanguageExplanation:`The supplied quote does not state ${label}. That does not mean a charge, exclusion, or problem exists; it is information worth clarifying.`, affectedQuoteIds:[quote.id], evidenceRefs:[], confidence:1, questionsToAsk:[`Can you confirm the ${label}?`] }));
      if (value.certainty === "ambiguous" || value.certainty === "unreadable") findings.push(makeFinding({ id:`uncertain-${quote.id}-${label.replaceAll(" ", "-")}`, type:"inference", severity:"attention", title:`${label[0].toUpperCase()}${label.slice(1)} is ${value.certainty}`, plainLanguageExplanation:`The source does not support a certain reading of the ${label}; no stronger claim is justified.`, affectedQuoteIds:[quote.id], evidenceRefs:value.evidence, confidence:0.75, questionsToAsk:[`Can you confirm the ${label} in writing?`] }));
    }
  }

  const compareText = (label: string, selector: (q: CanonicalQuote) => { value: string | null; certainty: string; evidence: EvidenceRef[] }) => {
    const rows = quotes.map(quote => ({ quote, value: selector(quote) })).filter(row => row.value.certainty === "stated" && row.value.value);
    if (rows.length >= 2 && unique(rows.map(row => row.value.value as string)).length > 1) findings.push(makeFinding({ id:`difference-${label.replaceAll(" ", "-")}`, type:"difference", severity:"attention", title:`${label[0].toUpperCase()}${label.slice(1)} differs between quotes`, plainLanguageExplanation:`The supplied quotes state different ${label}; compare the terms rather than assuming they are equivalent.`, affectedQuoteIds:rows.map(r => r.quote.id), evidenceRefs:rows.flatMap(r => r.value.evidence), questionsToAsk:[`Which ${label} best matches the intended job?`] }));
  };
  compareText("warranty", q => q.warranty); compareText("timeline", q => q.timeline); compareText("payment terms", q => q.paymentTerms);

  const totals = quotes.map(quote => ({ quote, total: statedNumber(quote.money.total) })).filter((r): r is { quote: CanonicalQuote; total: number } => r.total !== null);
  if (totals.length >= 2 && unique(totals.map(r => r.total)).length > 1) findings.push(makeFinding({ id:"difference-total", type:"difference", severity:"attention", title:"Quoted totals differ", plainLanguageExplanation:"The stated totals differ. Price alone does not establish equivalent scope.", affectedQuoteIds:totals.map(r => r.quote.id), evidenceRefs:totals.flatMap(r => r.quote.money.total.evidence), questionsToAsk:["Do the totals cover equivalent scope and terms?"] }));

  const scopes = quotes.map(quote => ({ quote, value: quote.projectDescription })).filter(r => r.value.certainty === "stated" && r.value.value);
  if (scopes.length >= 2 && unique(scopes.map(r => r.value.value)).length > 1) findings.push(makeFinding({ id:"difference-scope", type:"difference", severity:"important", title:"Project scope descriptions differ", plainLanguageExplanation:"The project descriptions are not identical, so direct price comparison may be incomplete.", affectedQuoteIds:scopes.map(r => r.quote.id), evidenceRefs:scopes.flatMap(r => r.value.evidence), questionsToAsk:["Can each vendor confirm the exact intended scope?"] }));

  const material = findings.filter(f => f.severity !== "info" || f.type !== "explicit_fact");
  const noMaterialConcern = material.length === 0;
  return {
    category,
    quotes: quotes.map(q => ({
      id:q.id,
      vendor:summaryValue(q.vendor),
      total:summaryValue(q.money.total),
      scopeIncluded:summaryValues(q.inclusions),
      scopeExcluded:summaryValues(q.exclusions),
      warranty:summaryValue(q.warranty),
      timeline:summaryValue(q.timeline),
      paymentTerms:summaryValue(q.paymentTerms)
    })),
    findings,
    sections:[
      { id:"standout", title:"What stands out", findingIds:findings.filter(f => f.type === "difference" || f.type === "explicit_fact").map(f => f.id) },
      { id:"risks", title:"Potential additional costs / risks", findingIds:findings.filter(f => f.type === "potential_risk").map(f => f.id) },
      { id:"unclear", title:"Missing or unclear information", findingIds:findings.filter(f => f.type === "not_stated" || f.type === "inference").map(f => f.id) },
    ],
    overallGutCheck:noMaterialConcern ? "No material concern is apparent from the supplied quote data." : "There are meaningful differences or uncertainties worth clarifying before deciding.",
    confidenceLimitations:[`Analysis used ${domain.label} context pack ${domain.id}.`, "Findings are limited to the supplied quote data and source evidence.", "Missing information is not treated as proof of an extra charge or exclusion."],
    noMaterialConcern,
  };
}
