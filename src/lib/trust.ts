import type { Finding, QuoteReport } from "./types";

export const findingLabels = {
  explicit_fact: "Explicit fact",
  difference: "Difference",
  not_stated: "Not stated",
  potential_risk: "Potential risk",
  inference: "Inference",
} as const;

export function trustSafeFindingText(finding: Finding): string {
  if (finding.type !== "not_stated") return finding.plainLanguageExplanation;
  const text = finding.plainLanguageExplanation.trim();
  const assertsExtraCharge = /\b(?:is|are|will be)\b.{0,24}\b(?:extra|additional)\s+(?:charge|fee|cost)\b/i.test(text);
  if (assertsExtraCharge) {
    return "This quote does not state this item clearly. That is a question to clarify, not proof of an additional charge.";
  }
  return text;
}

export function summarizeGutCheck(report: QuoteReport): string {
  if (report.noMaterialConcern) {
    return "No material concern is apparent from the information provided. Confirm normal project details before proceeding.";
  }
  return report.overallGutCheck;
}
