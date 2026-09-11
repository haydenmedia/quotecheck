export type QuoteCategory = "general" | "automotive" | "renovation" | "trades";
export type FindingType = "explicit_fact" | "difference" | "not_stated" | "potential_risk" | "inference";
export type Severity = "info" | "attention" | "important";

export interface EvidenceRef {
  quoteId: string;
  sourceLabel: string;
  excerpt: string;
  confidence: number;
}

export interface QuoteSummary {
  id: string;
  vendor: string;
  total: number;
  warranty: string;
  timeline: string;
  paymentTerms: string;
}

export interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  title: string;
  plainLanguageExplanation: string;
  affectedQuoteIds: string[];
  evidenceRefs: EvidenceRef[];
  confidence: number;
  questionsToAsk: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  findingIds: string[];
  locked?: boolean;
}

export interface QuoteReport {
  category: QuoteCategory;
  quotes: QuoteSummary[];
  findings: Finding[];
  sections: ReportSection[];
  overallGutCheck: string;
  confidenceLimitations: string[];
  noMaterialConcern: boolean;
}

export interface ExtractionProvider {
  extract(input: unknown): Promise<unknown>;
}

export interface ReasoningProvider {
  analyze(input: unknown): Promise<QuoteReport>;
}
