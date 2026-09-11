import { demoReport } from "@/fixtures/report";
import {
  DeterministicPaymentGateway,
  InMemoryReportOwnershipStore,
  lockedReportSession,
} from "./report-access";

export const DEMO_REPORT_SESSION_ID = "demo-report-v1";

const globalState = globalThis as typeof globalThis & {
  quoteCheckDemoStore?: InMemoryReportOwnershipStore;
  quoteCheckDemoGateway?: DeterministicPaymentGateway;
};

export const demoReportStore =
  globalState.quoteCheckDemoStore ??
  new InMemoryReportOwnershipStore([lockedReportSession(DEMO_REPORT_SESSION_ID, demoReport)]);

export const demoPaymentGateway =
  globalState.quoteCheckDemoGateway ?? new DeterministicPaymentGateway("succeeded");

if (process.env.NODE_ENV !== "production") {
  globalState.quoteCheckDemoStore = demoReportStore;
  globalState.quoteCheckDemoGateway = demoPaymentGateway;
}
