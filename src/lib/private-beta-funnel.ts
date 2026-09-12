import {
  isPrivateBetaEvent,
  type PrivateBetaEvent,
  type PrivateBetaEventName,
} from "./private-beta-instrumentation";

export type FunnelRate = {
  numerator: number;
  denominator: number;
  rate: number | null;
  status: "ok" | "not_enough_data";
};

export type PrivateBetaFunnelSummary = {
  starts: number;
  validInputRate: FunnelRate;
  analysisSuccessRate: FunnelRate;
  previewToUnlockIntentRate: FunnelRate;
  unlockSuccessRate: FunnelRate;
  fullReportCompletionRate: FunnelRate;
};

function rate(numerator: number, denominator: number): FunnelRate {
  if (denominator === 0) {
    return { numerator, denominator, rate: null, status: "not_enough_data" };
  }
  return { numerator, denominator, rate: numerator / denominator, status: "ok" };
}

function count(events: readonly PrivateBetaEvent[], name: PrivateBetaEventName): number {
  return events.filter((event) => event.name === name).length;
}

export function summarizePrivateBetaFunnel(events: readonly unknown[]): PrivateBetaFunnelSummary {
  const validated = events.map((event) => {
    if (!isPrivateBetaEvent(event)) {
      throw new Error("Invalid private-beta instrumentation event");
    }
    return event;
  });

  const accepted = count(validated, "quote_input_accepted");
  const rejected = count(validated, "quote_input_rejected");
  const analysisSucceeded = count(validated, "analysis_succeeded");
  const analysisFailed = count(validated, "analysis_failed");
  const previews = count(validated, "preview_viewed");
  const unlockIntents = count(validated, "unlock_intent");
  const unlockSucceeded = count(validated, "unlock_succeeded");
  const unlockFailed = count(validated, "unlock_failed");
  const fullReports = count(validated, "full_report_viewed");

  return {
    starts: count(validated, "comparison_started"),
    validInputRate: rate(accepted, accepted + rejected),
    analysisSuccessRate: rate(analysisSucceeded, analysisSucceeded + analysisFailed),
    previewToUnlockIntentRate: rate(unlockIntents, previews),
    unlockSuccessRate: rate(unlockSucceeded, unlockSucceeded + unlockFailed),
    fullReportCompletionRate: rate(fullReports, unlockSucceeded),
  };
}
