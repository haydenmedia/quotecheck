import { describe, expect, it } from "vitest";
import { summarizePrivateBetaFunnel } from "../src/lib/private-beta-funnel";
import { PRIVATE_BETA_EVENT_VERSION, type PrivateBetaEvent } from "../src/lib/private-beta-instrumentation";

const v = PRIVATE_BETA_EVENT_VERSION;

function completeStream(): PrivateBetaEvent[] {
  return [
    { version: v, name: "comparison_started", quoteCount: 2, category: "Automotive" },
    { version: v, name: "quote_input_accepted", ordinal: 1, inputKind: "pasted_text" },
    { version: v, name: "quote_input_accepted", ordinal: 2, inputKind: "pasted_text" },
    { version: v, name: "analysis_succeeded", quoteCount: 2, category: "Automotive" },
    { version: v, name: "preview_viewed" },
    { version: v, name: "unlock_intent" },
    { version: v, name: "unlock_succeeded" },
    { version: v, name: "full_report_viewed" },
  ];
}

describe("private beta funnel summary", () => {
  it("summarizes a complete local golden journey", () => {
    expect(summarizePrivateBetaFunnel(completeStream())).toEqual({
      starts: 1,
      validInputRate: { numerator: 2, denominator: 2, rate: 1, status: "ok" },
      analysisSuccessRate: { numerator: 1, denominator: 1, rate: 1, status: "ok" },
      previewToUnlockIntentRate: { numerator: 1, denominator: 1, rate: 1, status: "ok" },
      unlockSuccessRate: { numerator: 1, denominator: 1, rate: 1, status: "ok" },
      fullReportCompletionRate: { numerator: 1, denominator: 1, rate: 1, status: "ok" },
    });
  });

  it("summarizes partial and failure-heavy streams from event counts", () => {
    const events: PrivateBetaEvent[] = [
      { version: v, name: "comparison_started", quoteCount: 3, category: "General" },
      { version: v, name: "quote_input_accepted", ordinal: 1, inputKind: "pasted_text" },
      { version: v, name: "quote_input_rejected", inputKind: "unknown", reason: "MALFORMED_INPUT" },
      { version: v, name: "quote_input_rejected", inputKind: "unknown", reason: "UNSUPPORTED_INPUT_TYPE" },
      { version: v, name: "analysis_failed", quoteCount: 3, category: "General", reason: "ANALYSIS_FAILED" },
      { version: v, name: "preview_viewed" },
      { version: v, name: "preview_viewed" },
      { version: v, name: "unlock_intent" },
      { version: v, name: "unlock_failed", reason: "UNLOCK_NOT_CONFIRMED" },
    ];

    const summary = summarizePrivateBetaFunnel(events);
    expect(summary.starts).toBe(1);
    expect(summary.validInputRate).toEqual({ numerator: 1, denominator: 3, rate: 1 / 3, status: "ok" });
    expect(summary.analysisSuccessRate).toEqual({ numerator: 0, denominator: 1, rate: 0, status: "ok" });
    expect(summary.previewToUnlockIntentRate).toEqual({ numerator: 1, denominator: 2, rate: 0.5, status: "ok" });
    expect(summary.unlockSuccessRate).toEqual({ numerator: 0, denominator: 1, rate: 0, status: "ok" });
    expect(summary.fullReportCompletionRate).toEqual({ numerator: 0, denominator: 0, rate: null, status: "not_enough_data" });
  });

  it("reports not enough data for every zero-denominator rate", () => {
    expect(summarizePrivateBetaFunnel([])).toEqual({
      starts: 0,
      validInputRate: { numerator: 0, denominator: 0, rate: null, status: "not_enough_data" },
      analysisSuccessRate: { numerator: 0, denominator: 0, rate: null, status: "not_enough_data" },
      previewToUnlockIntentRate: { numerator: 0, denominator: 0, rate: null, status: "not_enough_data" },
      unlockSuccessRate: { numerator: 0, denominator: 0, rate: null, status: "not_enough_data" },
      fullReportCompletionRate: { numerator: 0, denominator: 0, rate: null, status: "not_enough_data" },
    });
  });

  it("rejects malformed or out-of-contract events instead of summarizing them", () => {
    expect(() => summarizePrivateBetaFunnel([
      { version: v, name: "preview_viewed", reportSessionId: "must-not-be-accepted" },
    ])).toThrow("Invalid private-beta instrumentation event");
    expect(() => summarizePrivateBetaFunnel([
      { version: 999, name: "preview_viewed" },
    ])).toThrow("Invalid private-beta instrumentation event");
  });
});
