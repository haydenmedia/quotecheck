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
  return typeof value === "string" && ANALYSIS_INPUT_LIMITS.acceptedKinds.includes(value as TextIngestionInput["kind"]);
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
      return { code: "MALFORMED_INPUT", message: "One of the quotes could not be read. Replace it and try again.", retryable: true };
    }

    const input = candidate as Partial<TextIngestionInput> & { kind?: unknown };
    if (!isAcceptedKind(input.kind)) {
      return { code: "UNSUPPORTED_INPUT_TYPE", message: "One of the quote inputs is not supported yet.", retryable: true };
    }
    if (typeof input.id !== "string" || !input.id.trim() || typeof input.label !== "string" || !input.label.trim() || typeof input.text !== "string" || !input.text.trim()) {
      return { code: "MALFORMED_INPUT", message: "One of the quotes could not be read. Replace it and try again.", retryable: true };
    }
    if (ids.has(input.id)) {
      return { code: "MALFORMED_INPUT", message: "Each quote must be a separate input. Replace the duplicate and try again.", retryable: true };
    }
    ids.add(input.id);

    if (input.text.length > ANALYSIS_INPUT_LIMITS.maxTextCharactersPerQuote) {
      return { code: "OVERSIZED_INPUT", message: "One of the quotes is too large to analyze safely. Use a shorter version and try again.", retryable: true };
    }
    totalCharacters += input.text.length;
  }

  if (totalCharacters > ANALYSIS_INPUT_LIMITS.maxTextCharactersTotal) {
    return { code: "OVERSIZED_INPUT", message: "The combined quote inputs are too large to analyze safely. Use shorter versions and try again.", retryable: true };
  }

  return null;
}

const CERTAINTIES = new Set(["stated", "ambiguous", "unreadable", "not_stated"]);
const CONDITION_SUBJECTS = new Set(["project_description", "total", "fees", "timeline", "payment_terms", "scope", "allowance"]);
const WARNING_CODES = new Set(["ARITHMETIC_MISMATCH", "AMBIGUOUS_FIELD", "UNREADABLE_FIELD"]);

function validEvidence(value: unknown, quoteId: string, sourceInputId: string): boolean {
  if (!isRecord(value)) return false;
  if (value.quoteId !== quoteId) return false;
  if (value.sourceInputId !== sourceInputId) return false;
  if (typeof value.sourceLabel !== "string" || !value.sourceLabel.trim()) return false;
  if (typeof value.excerpt !== "string" || !value.excerpt.trim()) return false;
  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) return false;
  if (value.locator !== undefined && !isRecord(value.locator)) return false;
  return true;
}

function validSourcedValue(
  value: unknown,
  quoteId: string,
  sourceInputId: string,
  expectedValue: "string" | "number",
): boolean {
  if (!isRecord(value) || typeof value.certainty !== "string" || !CERTAINTIES.has(value.certainty) || !Array.isArray(value.evidence)) {
    return false;
  }

  if (!value.evidence.every((ref) => validEvidence(ref, quoteId, sourceInputId))) return false;

  if (value.certainty === "not_stated") {
    return value.value === null && value.evidence.length === 0;
  }

  if (value.certainty === "unreadable") {
    return value.value === null && value.evidence.length > 0;
  }

  if (value.evidence.length === 0) return false;
  if (value.value === null) return value.certainty === "ambiguous";
  if (typeof value.value !== expectedValue) return false;
  return expectedValue !== "number" || Number.isFinite(value.value as number);
}

function validSourcedList(
  value: unknown,
  quoteId: string,
  sourceInputId: string,
): boolean {
  return Array.isArray(value) && value.every((entry) => validSourcedValue(entry, quoteId, sourceInputId, "string"));
}

function validLineItems(value: unknown, quoteId: string, sourceInputId: string): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id.trim()) return false;
    return validSourcedValue(item.description, quoteId, sourceInputId, "string")
      && validSourcedValue(item.quantity, quoteId, sourceInputId, "number")
      && validSourcedValue(item.unit, quoteId, sourceInputId, "string")
      && validSourcedValue(item.labour, quoteId, sourceInputId, "number")
      && validSourcedValue(item.materials, quoteId, sourceInputId, "number")
      && validSourcedValue(item.price, quoteId, sourceInputId, "number");
  });
}

function validWarnings(value: unknown, quoteId: string, sourceInputId: string): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((warning) => {
    if (!isRecord(warning) || typeof warning.code !== "string" || !WARNING_CODES.has(warning.code)) return false;
    if (typeof warning.message !== "string" || !warning.message.trim() || !Array.isArray(warning.evidence) || warning.evidence.length === 0) return false;
    return warning.evidence.every((ref) => validEvidence(ref, quoteId, sourceInputId));
  });
}

function validTypedConditions(value: unknown, quoteId: string, sourceInputId: string): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((condition) => isRecord(condition)
    && typeof condition.subject === "string"
    && CONDITION_SUBJECTS.has(condition.subject)
    && validSourcedValue(condition.value, quoteId, sourceInputId, "string"));
}

function validExtractionResult(result: unknown, input: TextIngestionInput): boolean {
  if (!isRecord(result) || result.sourceInputId !== input.id || typeof result.rawText !== "string" || !isRecord(result.quote)) {
    return false;
  }

  const quote = result.quote;
  if (typeof quote.id !== "string" || !quote.id.trim() || !Array.isArray(quote.sourceInputIds) || !quote.sourceInputIds.includes(input.id)) {
    return false;
  }
  const quoteId = quote.id;

  if (!validSourcedValue(quote.vendor, quoteId, input.id, "string")
    || !validSourcedValue(quote.quoteDate, quoteId, input.id, "string")
    || !validSourcedValue(quote.expiryDate, quoteId, input.id, "string")
    || !validSourcedValue(quote.projectDescription, quoteId, input.id, "string")
    || !validLineItems(quote.lineItems, quoteId, input.id)
    || !isRecord(quote.money)
    || !validSourcedValue(quote.money.subtotal, quoteId, input.id, "number")
    || !validSourcedValue(quote.money.tax, quoteId, input.id, "number")
    || !validSourcedValue(quote.money.fees, quoteId, input.id, "number")
    || !validSourcedValue(quote.money.total, quoteId, input.id, "number")
    || !validSourcedList(quote.allowances, quoteId, input.id)
    || !validSourcedList(quote.inclusions, quoteId, input.id)
    || !validSourcedList(quote.exclusions, quoteId, input.id)
    || !validSourcedValue(quote.warranty, quoteId, input.id, "string")
    || !validSourcedValue(quote.timeline, quoteId, input.id, "string")
    || !validSourcedValue(quote.paymentTerms, quoteId, input.id, "string")
    || !validSourcedList(quote.conditions, quoteId, input.id)
    || !validTypedConditions(quote.typedConditions, quoteId, input.id)
    || !validSourcedList(quote.uncertainties, quoteId, input.id)
    || !validWarnings(quote.warnings, quoteId, input.id)) {
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
    return failure(request.reportSessionId, validationError.code, validationError.message, validationError.retryable);
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
