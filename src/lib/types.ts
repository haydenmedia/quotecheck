export type QuoteCategory = "general" | "automotive" | "renovation" | "trades";
export type FindingType = "explicit_fact" | "difference" | "not_stated" | "potential_risk" | "inference";
export type Severity = "info" | "attention" | "important";
export type Certainty = "stated" | "ambiguous" | "unreadable" | "not_stated";

export interface SourceLocator {
  page?: number;
  line?: number;
  start?: number;
  end?: number;
}

export interface EvidenceRef {
  quoteId: string;
  sourceInputId?: string;
  sourceLabel: string;
  excerpt: string;
  locator?: SourceLocator;
  confidence: number;
}

export interface SourcedValue<T> {
  value: T | null;
  certainty: Certainty;
  evidence: EvidenceRef[];
}

export interface QuoteLineItem {
  id: string;
  description: SourcedValue<string>;
  quantity: SourcedValue<number>;
  unit: SourcedValue<string>;
  labour: SourcedValue<number>;
  materials: SourcedValue<number>;
  price: SourcedValue<number>;
}

export interface QuoteMoneySummary {
  subtotal: SourcedValue<number>;
  tax: SourcedValue<number>;
  fees: SourcedValue<number>;
  total: SourcedValue<number>;
}

export interface ExtractionWarning {
  code: "ARITHMETIC_MISMATCH" | "AMBIGUOUS_FIELD" | "UNREADABLE_FIELD";
  message: string;
  evidence: EvidenceRef[];
}

export interface CanonicalQuote {
  id: string;
  sourceInputIds: string[];
  vendor: SourcedValue<string>;
  quoteDate: SourcedValue<string>;
  expiryDate: SourcedValue<string>;
  projectDescription: SourcedValue<string>;
  lineItems: QuoteLineItem[];
  money: QuoteMoneySummary;
  allowances: SourcedValue<string>[];
  inclusions: SourcedValue<string>[];
  exclusions: SourcedValue<string>[];
  warranty: SourcedValue<string>;
  timeline: SourcedValue<string>;
  paymentTerms: SourcedValue<string>;
  conditions: SourcedValue<string>[];
  uncertainties: SourcedValue<string>[];
  warnings: ExtractionWarning[];
}

export interface TextIngestionInput {
  id: string;
  label: string;
  kind: "pasted_text" | "extracted_text_fixture";
  text: string;
  page?: number;
}

export interface ExtractionResult {
  quote: CanonicalQuote;
  rawText: string;
  sourceInputId: string;
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
  extract(input: TextIngestionInput): Promise<ExtractionResult>;
}

export interface ReasoningProvider {
  analyze(input: CanonicalQuote[]): Promise<QuoteReport>;
}
