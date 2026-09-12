import { describe, expect, it } from "vitest";
import { trustEvalGroundingFixturesV1 } from "../src/evals/fixtures/v1-grounding";
import { evaluateTrustCase } from "../src/evals/trust-evaluator-v2";

function fixture(id: string) {
  const source = trustEvalGroundingFixturesV1.find(test => test.id === id);
  if (!source) throw new Error(`Missing fixture ${id}`);
  return structuredClone(source);
}

describe("CP7 structural inference authorization", () => {
  it("accepts valid timeline proposition without legacy inferenceBasis", () => {
    const test = fixture("condition-scheduling-inference-accepted");
    delete test.report.findings[0].inferenceBasis;
    expect(evaluateTrustCase(test).actual).toBe("pass");
  });

  it("accepts valid warranty proposition without legacy inferenceBasis", () => {
    const test = fixture("field-compatible-uncertainty-inference-accepted");
    delete test.report.findings[0].inferenceBasis;
    expect(evaluateTrustCase(test).actual).toBe("pass");
  });

  it("rejects legacy inferenceBasis when structural proposition is missing", () => {
    const test = fixture("condition-scheduling-inference-accepted");
    delete test.report.findings[0].inferenceProposition;
    const result = evaluateTrustCase(test);
    expect(result.actual).toBe("fail");
    expect(result.failures.map(failure => failure.code)).toContain("UNSUPPORTED_INFERENCE");
  });

  it("rejects malformed structural proposition", () => {
    const test = fixture("condition-scheduling-inference-accepted");
    const finding = test.report.findings[0] as any;
    finding.inferenceProposition = { kind: "unknown_proposition", evidenceRefs: finding.evidenceRefs };
    delete finding.inferenceBasis;
    const result = evaluateTrustCase(test);
    expect(result.actual).toBe("fail");
    expect(result.failures.map(failure => failure.code)).toContain("UNSUPPORTED_INFERENCE");
  });
});
