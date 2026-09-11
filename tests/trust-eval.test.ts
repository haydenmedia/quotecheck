import { describe, expect, it } from "vitest";
import { trustEvalFixturesV1 } from "../src/evals/fixtures/v1";
import { evaluateTrustCase, evaluateTrustSuite } from "../src/evals/trust-evaluator";

describe("CP7 deterministic trust evaluation harness", () => {
  it("matches every versioned trust fixture outcome", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    console.log(`TRUST_EVAL_JSON=${JSON.stringify(suite)}`);
    console.log(`TRUST_EVAL_SUMMARY=${suite.summary}`);
    expect(suite.fixtureVersion).toBe(1);
    expect(suite.caseCount).toBeGreaterThanOrEqual(18);
    expect(suite.matchedCount).toBe(suite.caseCount);
    expect(suite.passed).toBe(true);
  });

  it("exercises every required hard-failure class", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    const detected = new Set(suite.results.flatMap(result => result.failures.map(failure => failure.code)));
    expect(detected.has("UNSUPPORTED_FACT")).toBe(true);
    expect(detected.has("CONTRADICTORY_EVIDENCE")).toBe(true);
    expect(detected.has("ARITHMETIC_CORRUPTION")).toBe(true);
    expect(detected.has("HIDDEN_UNCERTAINTY")).toBe(true);
  });

  it("rejects unrelated canonical evidence and generic uncertainty masking", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    const byId = new Map(suite.results.map(result => [result.caseId, result]));
    expect(byId.get("borrowed-unrelated-evidence-hard-fail")?.failures.map(f => f.code)).toContain("UNSUPPORTED_FACT");
    expect(byId.get("generic-uncertainty-limitation-hard-fail")?.failures.map(f => f.code)).toContain("HIDDEN_UNCERTAINTY");
    expect(byId.get("uncertainty-hidden-hard-fail")?.failures.map(f => f.code)).toContain("HIDDEN_UNCERTAINTY");
  });

  it("requires structured risk provenance rather than same-topic or same-field wording", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    const byId = new Map(suite.results.map(result => [result.caseId, result]));
    for (const id of ["neutral-same-field-risk-rejected", "borrowed-unrelated-risk-rejected", "unrelated-conditional-same-topic-rejected"]) {
      expect(byId.get(id)?.actual).toBe("fail");
      expect(byId.get(id)?.failures.map(f => f.code)).toContain("FALSE_POSITIVE_RISK");
    }
  });

  it("accepts only condition-compatible canonical risk sources", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    const byId = new Map(suite.results.map(result => [result.caseId, result]));
    for (const id of ["legitimate-material-concern", "compatible-exclusion-risk", "compatible-allowance-risk", "compatible-uncertainty-risk", "compatible-scheduling-condition-risk"]) {
      expect(byId.get(id)?.actual).toBe("pass");
      expect(byId.get(id)?.failures).toEqual([]);
    }
  });

  it("rejects a fabricated potential risk that borrows unrelated canonical evidence", () => {
    const source = trustEvalFixturesV1.find(test => test.id === "false-positive-risk-rejected")!;
    const borrowedEvidence = source.quotes[0].money.total.evidence;
    const fabricated = structuredClone(source);
    fabricated.id = "borrowed-unrelated-risk-regression";
    fabricated.report.findings[0].evidenceRefs = borrowedEvidence;
    fabricated.report.findings[0].plainLanguageExplanation = "Disposal may trigger an additional fee.";
    fabricated.expectedFailureCodes = ["FALSE_POSITIVE_RISK"];
    const result = evaluateTrustCase(fabricated);
    expect(result.actual).toBe("fail");
    expect(result.failures.map(f => f.code)).toContain("FALSE_POSITIVE_RISK");
  });

  it("covers trust semantics beyond hard failures", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    const byId = new Map(suite.results.map(result => [result.caseId, result]));
    expect(byId.get("not-stated-versus-excluded")?.actual).toBe("pass");
    expect(byId.get("absence-is-not-charge")?.failures.map(f => f.code)).toContain("ABSENCE_AS_CHARGE");
    expect(byId.get("false-positive-risk-rejected")?.failures.map(f => f.code)).toContain("FALSE_POSITIVE_RISK");
    expect(byId.get("grounded-no-material-problem")?.actual).toBe("pass");
    expect(byId.get("uncertainty-preserved")?.actual).toBe("pass");
  });
});
