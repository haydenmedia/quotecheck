import type { Certainty, Finding, QuoteReport, QuoteSummary, ReportSummaryValue, ScopeStatus, ScopeSummaryValue } from "./types";
import { findingLabels, summarizeGutCheck, trustSafeFindingText } from "./trust";
import { formatQuoteTotal } from "./reasoning";

export const demoUnlockCopy = {
  price: "CA$14.99",
  cadence: "one-time",
  livePayment: false,
} as const;

export const scopeStatusLabels: Record<ScopeStatus, string> = {
  included: "Explicitly included",
  excluded: "Explicitly excluded",
  not_stated: "Not stated",
};

const certaintyLabels: Record<Certainty, string> = {
  stated: "Stated",
  ambiguous: "Ambiguous",
  unreadable: "Unreadable",
  not_stated: "Not stated",
};

function evidenceLabels(value: ReportSummaryValue<unknown>) {
  return value.evidence.map((evidence) => `${evidence.sourceLabel}: “${evidence.excerpt}”`);
}

export function presentQuoteValue(value: ScopeSummaryValue) {
  const normalized = value.value?.trim() || null;
  const label = value.certainty === "stated"
    ? (normalized ?? "Not stated")
    : value.certainty === "ambiguous"
      ? (normalized ?? "Source wording is unclear")
      : value.certainty === "unreadable"
        ? "Could not reliably read this field"
        : "Not stated";

  return { label, certainty: value.certainty, certaintyLabel: certaintyLabels[value.certainty], evidence: evidenceLabels(value) };
}

export function presentTotalValue(value: ReportSummaryValue<number>) {
  return { label: formatQuoteTotal(value), certainty: value.certainty, certaintyLabel: certaintyLabels[value.certainty], evidence: evidenceLabels(value) };
}

export function presentScopeValues(values: ScopeSummaryValue[]) {
  const sourceValues = values.length > 0 ? values : [{ value: null, certainty: "not_stated" as const, evidence: [] }];
  return sourceValues.map((item) => {
    const presented = presentQuoteValue(item);
    return { ...presented, label: item.certainty === "unreadable" ? "Could not reliably read this scope item" : presented.label };
  });
}

export function presentQuoteSummary(quote: QuoteSummary) {
  return {
    ...quote,
    vendorDetail: presentQuoteValue(quote.vendor),
    totalDetail: presentTotalValue(quote.total),
    totalLabel: formatQuoteTotal(quote.total),
    scopeIncludedDetails: presentScopeValues(quote.scopeIncluded),
    scopeExcludedDetails: presentScopeValues(quote.scopeExcluded),
    warrantyDetail: presentQuoteValue(quote.warranty),
    timelineDetail: presentQuoteValue(quote.timeline),
    paymentTermsDetail: presentQuoteValue(quote.paymentTerms),
  };
}

export function presentFinding(finding: Finding) {
  return {
    ...finding,
    typeLabel: findingLabels[finding.type],
    body: trustSafeFindingText(finding),
    scopeStatusLabel: finding.scopeStatus ? scopeStatusLabels[finding.scopeStatus] : null,
    evidence: finding.evidenceRefs.map((evidence) => `${evidence.sourceLabel}: “${evidence.excerpt}”`),
  };
}

export function reportHeadline(report: QuoteReport): { tone: "calm" | "attention"; title: string; body: string } {
  if (report.noMaterialConcern) return { tone: "calm", title: "Nothing material stands out", body: summarizeGutCheck(report) };
  return { tone: "attention", title: "A few differences are worth a closer look", body: summarizeGutCheck(report) };
}

export function visibleSections(report: QuoteReport, unlocked = false) {
  return report.sections.map((section) => ({ ...section, isLocked: Boolean(section.locked && !unlocked) }));
}

/**
 * Builds the only report-shaped value the UI is allowed to render.
 * In preview mode, locked section metadata and findings are omitted entirely rather
 * than hidden with CSS. This keeps paid findings out of the preview DOM and out of
 * presentation state while preserving the exact same underlying report for unlock.
 */
export function reportSurface(report: QuoteReport, unlocked = false) {
  const allowedSections = report.sections.filter((section) => unlocked || !section.locked);

  return {
    access: unlocked ? ("full" as const) : ("preview" as const),
    category: report.category,
    headline: reportHeadline(report),
    quotes: report.quotes.map(presentQuoteSummary),
    sections: allowedSections.map((section) => ({
      id: section.id,
      title: section.title,
      findings: section.findingIds
        .map((id) => report.findings.find((finding) => finding.id === id))
        .filter((finding): finding is Finding => Boolean(finding))
        .map(presentFinding),
    })),
    confidenceLimitations: [...report.confidenceLimitations],
    noMaterialConcern: report.noMaterialConcern,
  };
}
