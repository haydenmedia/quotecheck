import { randomUUID } from "node:crypto";
import { analyzeQuotesSafely } from "./analysis-boundary";
import { DeterministicTextExtractionProvider } from "./ingestion";
import { orderedQuoteSelections, type QuoteSelections, type QuoteSlotId } from "./quote-intake";
import { DeterministicReasoningProvider } from "./reasoning";
import {
  ProviderRequiredImageTextProvider,
  extractQuoteSelection,
  type ImageTextProvider,
  type QuoteSourceMetadata,
} from "./source-extraction";
import type { ExtractionProvider, QuoteCategory, QuoteReport, ReasoningProvider } from "./types";

export type RealAnalysisErrorCode =
  | "INVALID_SELECTIONS"
  | "SOURCE_EXTRACTION_FAILED"
  | "ANALYSIS_FAILED";

export type RealQuoteAnalysisResult =
  | {
      ok: true;
      reportSessionId: string;
      report: QuoteReport;
      sources: QuoteSourceMetadata[];
    }
  | {
      ok: false;
      reportSessionId: string;
      error: {
        code: RealAnalysisErrorCode;
        message: string;
        retryable: boolean;
        slotId?: QuoteSlotId;
        sourceCode?: string;
      };
    };

export interface RealAnalysisProviders {
  imageTextProvider?: ImageTextProvider;
  extractionProvider?: ExtractionProvider;
  reasoningProvider?: ReasoningProvider;
  createReportSessionId?: () => string;
}

function failure(
  reportSessionId: string,
  code: RealAnalysisErrorCode,
  message: string,
  retryable: boolean,
  extra: { slotId?: QuoteSlotId; sourceCode?: string } = {},
): RealQuoteAnalysisResult {
  return { ok: false, reportSessionId, error: { code, message, retryable, ...extra } };
}

export async function analyzeRealQuoteSelections(
  selections: QuoteSelections,
  category: QuoteCategory,
  providers: RealAnalysisProviders = {},
): Promise<RealQuoteAnalysisResult> {
  const reportSessionId = providers.createReportSessionId?.() ?? randomUUID();

  if (!selections[1] || !selections[2]) {
    return failure(reportSessionId, "INVALID_SELECTIONS", "Add Quote 1 and Quote 2 before analyzing.", true);
  }

  const ordered = orderedQuoteSelections(selections);
  if (ordered.length < 2 || ordered.length > 3) {
    return failure(reportSessionId, "INVALID_SELECTIONS", "Add 2 or 3 quotes to compare.", true);
  }

  const imageProvider = providers.imageTextProvider ?? new ProviderRequiredImageTextProvider();
  const inputs = [];
  const sources: QuoteSourceMetadata[] = [];

  for (const selection of ordered) {
    const extracted = await extractQuoteSelection(selection, imageProvider);
    if (!extracted.ok) {
      return failure(
        reportSessionId,
        "SOURCE_EXTRACTION_FAILED",
        extracted.error.message,
        extracted.error.retryable,
        { slotId: selection.slotId, sourceCode: extracted.error.code },
      );
    }
    inputs.push(extracted.input);
    sources.push(extracted.source);
  }

  const analysis = await analyzeQuotesSafely(
    { reportSessionId, inputs, category },
    providers.extractionProvider ?? new DeterministicTextExtractionProvider(),
    providers.reasoningProvider ?? new DeterministicReasoningProvider(),
  );

  if (!analysis.ok) {
    return failure(
      reportSessionId,
      "ANALYSIS_FAILED",
      analysis.error.message,
      analysis.error.retryable,
      { sourceCode: analysis.error.code },
    );
  }

  return {
    ok: true,
    reportSessionId: analysis.reportSessionId,
    report: analysis.report,
    sources,
  };
}
