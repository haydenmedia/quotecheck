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

function isAcceptedKind(value: unknown): value is TextIngestionInput["kind"] {
  return typeof value === "string" && ANALYSIS_INPUT_LIMITS.acceptedKinds.includes(value as TextIngestionInput["kind"]);
}

export function validateAnalysisInputs(inputs: readonly unknown[]): AnalysisBoundaryError | null {
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
    if (!candidate || typeof candidate !== "object") {
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
      extracted.push(await extractionProvider.extract(input));
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
