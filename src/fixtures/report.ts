import type { QuoteReport, ReportSummaryValue, ScopeSummaryValue } from "@/lib/types";

const statedValue = (value: string): ScopeSummaryValue => ({ value, certainty: "stated", evidence: [] });
const statedNumber = (value: number): ReportSummaryValue<number> => ({ value, certainty: "stated", evidence: [] });

export const demoReport: QuoteReport = {
  category: "renovation",
  quotes: [
    { id: "north", vendor: statedValue("North Ridge Renovations"), total: statedNumber(18400), scopeIncluded: [statedValue("Demolition"), statedValue("Cabinet installation"), statedValue("Flooring installation")], scopeExcluded: [statedValue("Permit fees")], warranty: statedValue("2 years workmanship"), timeline: statedValue("3–4 weeks"), paymentTerms: statedValue("25% deposit, progress draws") },
    { id: "cedar", vendor: statedValue("Cedar Works"), total: statedNumber(16950), scopeIncluded: [statedValue("Demolition"), statedValue("Cabinet installation")], scopeExcluded: [], warranty: statedValue("1 year workmanship"), timeline: statedValue("4–5 weeks"), paymentTerms: statedValue("40% deposit, balance on completion") },
    { id: "summit", vendor: statedValue("Summit Contracting"), total: statedNumber(19780), scopeIncluded: [statedValue("Demolition"), statedValue("Cabinet installation"), statedValue("Flooring installation"), statedValue("Debris removal")], scopeExcluded: [statedValue("Appliance supply")], warranty: statedValue("3 years workmanship"), timeline: statedValue("3 weeks"), paymentTerms: statedValue("20% deposit, two progress draws") }
  ],
  findings: [
    { id: "f1", type: "explicit_fact", severity: "info", title: "Summit includes the longest workmanship warranty", plainLanguageExplanation: "Summit states a 3-year workmanship warranty, compared with 2 years from North Ridge and 1 year from Cedar Works.", affectedQuoteIds: ["north", "cedar", "summit"], evidenceRefs: [{ quoteId: "summit", sourceLabel: "Quote page 2", excerpt: "3 year workmanship warranty", confidence: 0.99 }], confidence: 0.99, questionsToAsk: [] },
    { id: "f2", type: "difference", severity: "attention", title: "Deposit requirements differ materially", plainLanguageExplanation: "Cedar Works asks for 40% up front, while the other quotes request 20–25% deposits.", affectedQuoteIds: ["north", "cedar", "summit"], evidenceRefs: [{ quoteId: "cedar", sourceLabel: "Quote page 1", excerpt: "40% deposit", confidence: 0.99 }], confidence: 0.99, questionsToAsk: ["What work or materials are covered by the initial deposit?"] },
    { id: "f3", type: "not_stated", severity: "important", title: "Cedar Works does not state disposal handling", plainLanguageExplanation: "The Cedar Works quote does not clearly say whether demolition debris removal and disposal are included. This is not evidence of an extra fee; it is a scope question to clarify.", affectedQuoteIds: ["cedar"], evidenceRefs: [], confidence: 0.88, questionsToAsk: ["Is demolition debris removal and disposal included in the quoted total?"], scopeStatus: "not_stated" },
    { id: "f4", type: "potential_risk", severity: "important", title: "Allowance wording could move the final price", plainLanguageExplanation: "North Ridge uses a flooring allowance rather than a fixed material selection. If the final product exceeds the allowance, the project total may increase.", affectedQuoteIds: ["north"], evidenceRefs: [{ quoteId: "north", sourceLabel: "Quote page 2", excerpt: "$3,200 flooring allowance", confidence: 0.98 }], confidence: 0.94, questionsToAsk: ["Which flooring products fit within the allowance, including tax and delivery?"] },
    { id: "f5", type: "inference", severity: "attention", title: "Summit's higher total may buy more certainty", plainLanguageExplanation: "Summit's price is highest, but its shorter stated timeline, longer warranty, and more explicit scope reduce some uncertainty. That does not automatically make it the best value.", affectedQuoteIds: ["summit"], evidenceRefs: [], confidence: 0.82, questionsToAsk: ["Can you confirm there are no material allowances beyond those listed?"] },
    { id: "f6", type: "explicit_fact", severity: "attention", title: "North Ridge explicitly excludes permit fees", plainLanguageExplanation: "North Ridge explicitly lists permit fees as excluded from the quoted scope. This is different from an item simply not being mentioned.", affectedQuoteIds: ["north"], evidenceRefs: [{ quoteId: "north", sourceLabel: "Quote page 3", excerpt: "Permit fees excluded", confidence: 0.99 }], confidence: 0.99, questionsToAsk: ["Who will obtain the permit and what should I budget for the fee?"], scopeStatus: "excluded" }
  ],
  sections: [
    { id: "standout", title: "What stands out", findingIds: ["f1", "f2"] },
    { id: "costs", title: "Potential additional costs", findingIds: ["f4"], locked: true },
    { id: "unclear", title: "Missing or unclear", findingIds: ["f3"], locked: true },
    { id: "scope", title: "Scope differences", findingIds: ["f6", "f5"], locked: true },
    { id: "terms", title: "Warranty, timing & payment", findingIds: ["f1", "f2"], locked: true },
    { id: "questions", title: "Questions to ask vendors", findingIds: ["f3", "f4", "f6"], locked: true }
  ],
  overallGutCheck: "No quote is an obvious winner. Cedar is cheapest but has the highest deposit and one meaningful scope ambiguity. Summit costs more but is more explicit and carries the strongest stated warranty.",
  confidenceLimitations: ["This demo uses deterministic fixture data, not live AI.", "QuoteCheck identifies questions and differences; it is not a professional appraisal or legal opinion."],
  noMaterialConcern: false
};

export const scopeUncertaintyFixtureV1: QuoteReport = {
  ...demoReport,
  quotes: [{ ...demoReport.quotes[0], id: "uncertain-scope", vendor: statedValue("Uncertain Scope Co."), scopeIncluded: [{ value: "Surface preparation may be included", certainty: "ambiguous", evidence: [{ quoteId: "uncertain-scope", sourceInputId: "scan-1", sourceLabel: "Scan page 2", excerpt: "Prep incl.?", confidence: 0.55 }] }], scopeExcluded: [{ value: null, certainty: "unreadable", evidence: [{ quoteId: "uncertain-scope", sourceInputId: "scan-1", sourceLabel: "Scan page 3", excerpt: "Exclusions: [unreadable]", confidence: 0.2 }] }] }],
};

export const termUncertaintyFixtureV1: QuoteReport = {
  ...demoReport,
  quotes: [{ ...demoReport.quotes[0], id: "uncertain-terms", vendor: statedValue("Uncertain Terms Co."), warranty: { value: "Possibly 2 years", certainty: "ambiguous", evidence: [{ quoteId: "uncertain-terms", sourceInputId: "scan-2", sourceLabel: "Scan page 4", excerpt: "Warranty: 2 yrs?", confidence: 0.5 }] }, timeline: { value: null, certainty: "unreadable", evidence: [{ quoteId: "uncertain-terms", sourceInputId: "scan-2", sourceLabel: "Scan page 1", excerpt: "Timeline: [unreadable]", confidence: 0.2 }] }, paymentTerms: { value: null, certainty: "not_stated", evidence: [] } }],
};

export const systemicUncertaintyFixtureV1: QuoteReport = {
  ...demoReport,
  quotes: [{
    ...demoReport.quotes[0],
    id: "systemic-uncertainty",
    vendor: { value: "Possibly Acme", certainty: "ambiguous", evidence: [{ quoteId: "systemic-uncertainty", sourceLabel: "Scan page 1", excerpt: "Acme?", confidence: 0.5 }] },
    total: { value: null, certainty: "unreadable", evidence: [{ quoteId: "systemic-uncertainty", sourceLabel: "Scan page 2", excerpt: "Total: [unreadable]", confidence: 0.2 }] },
  }],
};

export const noConcernReport: QuoteReport = { ...demoReport, findings: [], sections: [], noMaterialConcern: true, overallGutCheck: "" };
