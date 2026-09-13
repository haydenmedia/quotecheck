import {
  beginOneTimeCheckout,
  confirmOneTimeCheckout,
  DeterministicPaymentGateway,
  InMemoryReportOwnershipStore,
  lockedReportSession,
  type ReportOwnershipRecord,
} from "./report-access";
import type { RealQuoteAnalysisResult } from "./real-analysis";
import type { QuoteReport } from "./types";

export const GENERATED_REPORT_SESSION_COOKIE = "quotecheck-report-session";

const globalState = globalThis as typeof globalThis & {
  quoteCheckGeneratedReportStore?: InMemoryReportOwnershipStore;
  quoteCheckGeneratedPaymentGateway?: DeterministicPaymentGateway;
};

export const generatedReportStore =
  globalState.quoteCheckGeneratedReportStore ?? new InMemoryReportOwnershipStore();

export const generatedPaymentGateway =
  globalState.quoteCheckGeneratedPaymentGateway ?? new DeterministicPaymentGateway("succeeded");

// CP13 remains local/test only. Keep the generated session in-process so the exact
// completed report can flow from analysis -> preview -> deterministic unlock without
// introducing production storage or payment configuration.
globalState.quoteCheckGeneratedReportStore = generatedReportStore;
globalState.quoteCheckGeneratedPaymentGateway = generatedPaymentGateway;

export async function saveGeneratedReport(
  reportSessionId: string,
  report: QuoteReport,
): Promise<ReportOwnershipRecord> {
  const record = lockedReportSession(reportSessionId, report);
  await generatedReportStore.put(record);
  return record;
}

export async function getGeneratedReport(reportSessionId: string | null | undefined) {
  if (!reportSessionId) return null;
  return generatedReportStore.get(reportSessionId);
}

/**
 * Persist and bind only successful analysis results. The route supplies the cookie
 * writer so this lifecycle can be exercised deterministically without a browser.
 */
export async function bindSuccessfulGeneratedAnalysis(
  result: RealQuoteAnalysisResult,
  setSessionCookie: (reportSessionId: string) => void,
): Promise<ReportOwnershipRecord | null> {
  if (!result.ok) return null;

  const record = await saveGeneratedReport(result.reportSessionId, result.report);
  setSessionCookie(result.reportSessionId);
  return record;
}

/**
 * Unlock exactly the generated session selected by the server-scoped session id.
 * Unknown sessions remain unknown; another generated report is never substituted.
 */
export async function unlockGeneratedReportSession(
  reportSessionId: string | null | undefined,
): Promise<ReportOwnershipRecord | null> {
  if (!reportSessionId) return null;

  const checkout = await beginOneTimeCheckout(
    generatedReportStore,
    generatedPaymentGateway,
    reportSessionId,
  );
  if (!checkout) return null;

  return confirmOneTimeCheckout(
    generatedReportStore,
    generatedPaymentGateway,
    reportSessionId,
    checkout.checkoutId,
  );
}
