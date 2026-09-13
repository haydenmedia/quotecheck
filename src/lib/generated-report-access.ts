import {
  DeterministicPaymentGateway,
  InMemoryReportOwnershipStore,
  lockedReportSession,
  type ReportOwnershipRecord,
} from "./report-access";
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
