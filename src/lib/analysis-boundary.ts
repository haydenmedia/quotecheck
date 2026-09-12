import { getDomainPack } from "./domain-packs";
import type {
  ExtractionProvider,
  QuoteCategory,
  QuoteReport,
  ReasoningProvider,
  TextIngestionInput,
} from "./types";

export const ANALYSIS_INPUT_LIMITS = {
  minQuotes: 2,
  maxQuotes: 3,
  maxTextCharactersPerQuote: 100_000,
  maxTextCharactersTotal: 250_000,
  acceptedKinds: ["pasted_text", "extracted_text_fixture"] as const,
} as const;

export type AnalysisBoundaryErrorCode =
  | "INVALID_QUOTE_COUNT"
  | "UNSUPPORTED_INPUT_TYPE"
  | "OVERSIZED_INPUT"
  | "MALFORMED_INPUT"
  | "ANALYSIS_FAILED";

export interface AnalysisBoundaryError {
  code: AnalysisBoundaryErrorCode;
  message: string;
  retryable: boolean;
}

export type SafeAnalysisResult =
  | { ok: true; reportSessionId: string; report: QuoteReport }
  | { ok: false; reportSessionId: string; error: AnalysisBoundaryError };

export interface SafeAnalysisRequest {
  reportSessionId: string;
  inputs: TextIngestionInput[];
  category: QuoteCategory;
}

function failure(
  reportSessionId: string,
  code: AnalysisBoundaryErrorCode,
  message: string,
  retryable: boolean,
): SafeAnalysisResult {
  return { ok: false, reportSessionId, error: { code, message, retryable } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAcceptedKind(value: unknown): value is TextIngestionInput["kind"] {
  return typeof value === "string"
    && ANALYSIS_INPUT_LIMITS.acceptedKinds.includes(value as TextIngestionInput["kind"]);
}

export function validateAnalysisInputs(inputs: unknown): AnalysisBoundaryError | null {
  if (!Array.isArray(inputs)) {
    return {
      code: "MALFORMED_INPUT",
      message: "The quote inputs could not be read. Replace them and try again.",
      retryable: true,
    };
  }

  if (inputs.length < ANALYSIS_INPUT_LIMITS.minQuotes || inputs.length > ANALYSIS_INPUT_LIMITS.maxQuotes) {
    return {
      code: "INVALID_QUOTE_COUNT",
      message: "Add 2 or 3 quotes to compare.",
      retryable: true,
    };
  }

  let totalCharacters = 0;
  const ids = new Set<string>();

  for (const candidate of inputs) {
    if (!isRecord(candidate)) {
      return {
        code: "MALFORMED_INPUT",
        message: "One of the quotes could not be read. Replace it and try again.",
        retryable: true,
      };
    }

    const input = candidate as Partial<TextIngestionInput> & { kind?: unknown };
    if (!isAcceptedKind(input.kind)) {
      return {
        code: "UNSUPPORTED_INPUT_TYPE",
        message: "One of the quote inputs is not supported yet.",
        retryable: true,
      };
    }
    if (
      typeof input.id !== "string"
      || !input.id.trim()
      || typeof input.label !== "string"
      || !input.label.trim()
      || typeof input.text !== "string"
      || !input.text.trim()
    ) {
      return {
        code: "MALFORMED_INPUT",
        message: "One of the quotes could not be read. Replace it and try again.",
        retryable: true,
      };
    }
    if (ids.has(input.id)) {
      return {
        code: "MALFORMED_INPUT",
        message: "Each quote must be a separate input. Replace the duplicate and try again.",
        retryable: true,
      };
    }
    ids.add(input.id);

    if (input.text.length > ANALYSIS_INPUT_LIMITS.maxTextCharactersPerQuote) {
      return {
        code: "OVERSIZED_INPUT",
        message: "One of the quotes is too large to analyze safely. Use a shorter version and try again.",
        retryable: true,
      };
    }
    totalCharacters += input.text.length;
  }

  if (totalCharacters > ANALYSIS_INPUT_LIMITS.maxTextCharactersTotal) {
    return {
      code: "OVERSIZED_INPUT",
      message: "The combined quote inputs are too large to analyze safely. Use shorter versions and try again.",
      retryable: true,
    };
  }

  return null;
}

const CERTAINTIES = new Set(["stated", "ambiguous", "unreadable", "not_stated"]);
const CONDITION_SUBJECTS = new Set([
  "project_description",
  "total",
  "fees",
  "timeline",
  "payment_terms",
  "scope",
  "allowance",
]);
const WARNING_CODES = new Set(["ARITHMETIC_MISMATCH", "AMBIGUOUS_FIELD", "UNREADABLE_FIELD"]);

function excerptResolvesToInput(excerpt: string, locator: Record<string, unknown> | undefined, input: TextIngestionInput): boolean {
  const trimmedExcerpt = excerpt.trim();
  if (!trimmedExcerpt) return false;

  if (locator?.page !== undefined) {
    if (!Number.isInteger(locator.page) || (locator.page as number) < 1 || locator.page !== input.page) return false;
  }

  let resolvedByLocator = false;
  if (locator?.line !== undefined) {
    if (!Number.isInteger(locator.line) || (locator.line as number) < 1) return false;
    const sourceLine = input.text.split(/\r?\n/)[(locator.line as number) - 1];
    if (sourceLine === undefined || sourceLine.trim() !== trimmedExcerpt) return false;
    resolvedByLocator = true;
  }

  const hasStart = locator?.start !== undefined;
  const hasEnd = locator?.end !== undefined;
  if (hasStart !== hasEnd) return false;
  if (hasStart && hasEnd) {
    const start = locator?.start as number;
    const end = locator?.end as number;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > input.text.length) return false;
    if (input.text.slice(start, end).trim() !== trimmedExcerpt) return false;
    resolvedByLocator = true;
  }

  if (resolvedByLocator) return true;
  return input.text.includes(trimmedExcerpt)
    || input.text.split(/\r?\n/).some((line) => line.trim() === trimmedExcerpt);
}

function normalizedEvidenceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\[(?:ambiguous|unreadable)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceSupportsValue(excerpt: string, value: unknown, expectedValue: "string" | "number"): boolean {
  if (expectedValue === "string") {
    if (typeof value !== "string" || !value.trim()) return false;
    return normalizedEvidenceText(excerpt).includes(normalizedEvidenceText(value));
  }

  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  const numericTokens = excerpt.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/g) ?? [];
  return numericTokens.some((token) => Number(token) === value);
}

function validEvidence(value: unknown, quoteId: string, input: TextIngestionInput): boolean {
  if (!isRecord(value)) return false;
  if (value.quoteId !== quoteId) return false;
  if (value.sourceInputId !== input.id) return false;
  if (value.sourceLabel !== input.label) return false;
  if (typeof value.excerpt !== "string" || !value.excerpt.trim()) return false;
  if (
    typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence)
    || value.confidence < 0
    || value.confidence > 1
  ) return false;
  if (value.locator !== undefined && !isRecord(value.locator)) return false;
  return excerptResolvesToInput(value.excerpt, value.locator as Record<string, unknown> | undefined, input);
}

function validSourcedValue(
  value: unknown,
  quoteId: string,
  input: TextIngestionInput,
  expectedValue: "string" | "number",
): boolean {
  if (
    !isRecord(value)
    || typeof value.certainty !== "string"
    || !CERTAINTIES.has(value.certainty)
    || !Array.isArray(value.evidence)
  ) {
    return false;
  }

  if (!value.evidence.every((ref) => validEvidence(ref, quoteId, input))) return false;

  if (value.certainty === "not_stated") {
    return value.value === null && value.evidence.length === 0;
  }

  if (value.certainty === "unreadable") {
    return value.value === null && value.evidence.length > 0;
  }

  if (value.evidence.length === 0) return false;
  if (value.value === null) return value.certainty === "ambiguous";
  if (typeof value.value !== expectedValue) return false;
  if (expectedValue === "number" && !Number.isFinite(value.value as number)) return false;

  return value.evidence.some((ref) => isRecord(ref)
    && typeof ref.excerpt === "string"
    && evidenceSupportsValue(ref.excerpt, value.value, expectedValue));
}

function validSourcedList(value: unknown, quoteId: string, input: TextIngestionInput): boolean {
  return Array.isArray(value)
    && value.every((entry) => validSourcedValue(entry, quoteId, input, "string"));
}

function validLineItems(value: unknown, quoteId: string, input: TextIngestionInput): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id.trim()) return false;
    return validSourcedValue(item.description, quoteId, input, "string")
      && validSourcedValue(item.quantity, quoteId, input, "number")
      && validSourcedValue(item.unit, quoteId, input, "string")
      && validSourcedValue(item.labour, quoteId, input, "number")
      && validSourcedValue(item.materials, quoteId, input, "number")
      && validSourcedValue(item.price, quoteId, input, "number");
  });
}

function validWarnings(value: unknown, quoteId: string, input: TextIngestionInput): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((warning) => {
    if (!isRecord(warning) || typeof warning.code !== "string" || !WARNING_CODES.has(warning.code)) return false;
    if (
      typeof warning.message !== "string"
      || !warning.message.trim()
      || !Array.isArray(warning.evidence)
      || warning.evidence.length === 0
    ) return false;
    return warning.evidence.every((ref) => validEvidence(ref, quoteId, input));
  });
}

function validTypedConditions(value: unknown, quoteId: string, input: TextIngestionInput): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((condition) => isRecord(condition)
    && typeof condition.subject === "string"
    && CONDITION_SUBJECTS.has(condition.subject)
    && validSourcedValue(condition.value, quoteId, input, "string"));
}

function validExtractionResult(result: unknown, input: TextIngestionInput): boolean {
  if (
    !isRecord(result)
    || result.sourceInputId !== input.id
    || result.rawText !== input.text
    || !isRecord(result.quote)
  ) {
    return false;
  }

  const quote = result.quote;
  if (
    typeof quote.id !== "string"
    || !quote.id.trim()
    || !Array.isArray(quote.sourceInputIds)
    || !quote.sourceInputIds.includes(input.id)
  ) {
    return false;
  }
  const quoteId = quote.id;

  if (
    !validSourcedValue(quote.vendor, quoteId, input, "string")
    || !validSourcedValue(quote.quoteDate, quoteId, input, "string")
    || !validSourcedValue(quote.expiryDate, quoteId, input, "string")
    || !validSourcedValue(quote.projectDescription, quoteId, input, "string")
    || !validLineItems(quote.lineItems, quoteId, input)
    || !isRecord(quote.money)
    || !validSourcedValue(quote.money.subtotal, quoteId, input, "number")
    || !validSourcedValue(quote.money.tax, quoteId, input, "number")
    || !validSourcedValue(quote.money.fees, quoteId, input, "number")
    || !validSourcedValue(quote.money.total, quoteId, input, "number")
    || !validSourcedList(quote.allowances, quoteId, input)
    || !validSourcedList(quote.inclusions, quoteId, input)
    || !validSourcedList(quote.exclusions, quoteId, input)
    || !validSourcedValue(quote.warranty, quoteId, input, "string")
    || !validSourcedValue(quote.timeline, quoteId, input, "string")
    || !validSourcedValue(quote.paymentTerms, quoteId, input, "string")
    || !validSourcedList(quote.conditions, quoteId, input)
    || !validTypedConditions(quote.typedConditions, quoteId, input)
    || !validSourcedList(quote.uncertainties, quoteId, input)
    || !validWarnings(quote.warnings, quoteId, input)
  ) {
    return false;
  }

  return true;
}

export async function analyzeQuotesSafely(
  request: SafeAnalysisRequest,
  extractionProvider: ExtractionProvider,
  reasoningProvider: ReasoningProvider,
): Promise<SafeAnalysisResult> {
  const validationError = validateAnalysisInputs(request.inputs);
  if (validationError) {
    return failure(
      request.reportSessionId,
      validationError.code,
      validationError.message,
      validationError.retryable,
    );
  }

  try {
    const extracted = [];
    for (const input of request.inputs) {
      const result = await extractionProvider.extract(input);
      if (!validExtractionResult(result, input)) {
        return failure(
          request.reportSessionId,
          "ANALYSIS_FAILED",
          "We could not finish this comparison. Your report remains unchanged; please try again.",
          true,
        );
      }
      extracted.push(result);
    }

    const report = await reasoningProvider.analyze({
      quotes: extracted.map((result) => result.quote),
      category: request.category,
      domain: getDomainPack(request.category),
    });

    return { ok: true, reportSessionId: request.reportSessionId, report };
  } catch {
    return failure(
      request.reportSessionId,
      "ANALYSIS_FAILED",
      "We could not finish this comparison. Your report remains unchanged; please try again.",
      true,
    );
  }
}
