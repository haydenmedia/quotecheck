import { analyzeQuotesSafely, validateAnalysisInputs } from "./analysis-boundary";
import type { SafeAnalysisRequest, SafeAnalysisResult } from "./analysis-boundary";
import type { ExtractionProvider, QuoteCategory, ReasoningProvider } from "./types";
import {
  PRIVATE_BETA_EVENT_VERSION,
  noopPrivateBetaInstrumentation,
  recordPrivateBetaEvent,
  type PrivateBetaCategory,
  type PrivateBetaFailureCode,
  type PrivateBetaInputKind,
  type PrivateBetaInstrumentation,
} from "./private-beta-instrumentation";

const CATEGORY_LABELS: Record<QuoteCategory, PrivateBetaCategory> = {
  general: "General",
  automotive: "Automotive",
  renovation: "Renovation",
  trades: "Trades / Home Services",
};

function boundedQuoteCount(inputs: unknown): number {
  return Array.isArray(inputs) ? Math.min(inputs.length, 3) : 0;
}

function inputKind(inputs: unknown): PrivateBetaInputKind {
  if (!Array.isArray(inputs) || inputs.length === 0) return "unknown";
  const candidate = inputs.find((input) => Boolean(input) && typeof input === "object") as { kind?: unknown } | undefined;
  return candidate?.kind === "pasted_text" || candidate?.kind === "extracted_text_fixture"
    ? candidate.kind
    : "unknown";
}

export async function analyzeQuotesWithPrivateBetaInstrumentation(
  request: SafeAnalysisRequest,
  extractionProvider: ExtractionProvider,
  reasoningProvider: ReasoningProvider,
  instrumentation: PrivateBetaInstrumentation = noopPrivateBetaInstrumentation,
): Promise<SafeAnalysisResult> {
  const quoteCount = boundedQuoteCount(request.inputs);
  const category = CATEGORY_LABELS[request.category];

  recordPrivateBetaEvent(instrumentation, {
    version: PRIVATE_BETA_EVENT_VERSION,
    name: "comparison_started",
    quoteCount,
    category,
  });

  const validationError = validateAnalysisInputs(request.inputs);
  if (validationError) {
    recordPrivateBetaEvent(instrumentation, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "quote_input_rejected",
      inputKind: inputKind(request.inputs),
      reason: validationError.code,
    });
    recordPrivateBetaEvent(instrumentation, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "analysis_failed",
      quoteCount,
      category,
      reason: validationError.code,
    });
    return analyzeQuotesSafely(request, extractionProvider, reasoningProvider);
  }

  request.inputs.forEach((input, index) => {
    recordPrivateBetaEvent(instrumentation, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "quote_input_accepted",
      ordinal: index + 1,
      inputKind: input.kind,
    });
  });

  const result = await analyzeQuotesSafely(request, extractionProvider, reasoningProvider);
  if (result.ok) {
    recordPrivateBetaEvent(instrumentation, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "analysis_succeeded",
      quoteCount,
      category,
    });
  } else {
    recordPrivateBetaEvent(instrumentation, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "analysis_failed",
      quoteCount,
      category,
      reason: result.error.code as PrivateBetaFailureCode,
    });
  }

  return result;
}
