import { describe, expect, it } from "vitest";
import { trustEvalFixturesV1 } from "@/evals/fixtures/v1";
import { evaluateTrustSuite } from "@/evals/trust-evaluator";

describe("CP7 deterministic trust evaluation harness", () => {
  it("matches every versioned trust fixture outcome", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    console.log(`TRUST_EVAL_JSON=${JSON.stringify(suite)}`);
    console.log(`TRUST_EVAL_SUMMARY=${suite.summary}`);

    expect(suite.fixtureVersion).toBe(1);
    expect(suite.caseCount).toBeGreaterThanOrEqual(10);
    expect(suite.matchedCount).toBe(suite.caseCount);
    expect(suite.passed).toBe(true);
  });

  it("exercises every required hard-failure class", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    const detected = new Set(suite.results.flatMap(result => result.failures.map(failure => failure.code)));
    expect(detected).toEqual(expect.objectContaining ? detected : detected);
    expect(detected.has("UNSUPPORTED_FACT")).toBe(true);
    expect(detected.has("CONTRADICTORY_EVIDENCE")).toBe(true);
    expect(detected.has("ARITHMETIC_CORRUPTION")).toBe(true);
    expect(detected.has("HIDDEN_UNCERTAINTY")).toBe(true);
  });

  it("covers trust semantics beyond hard failures", () => {
    const suite = evaluateTrustSuite(trustEvalFixturesV1);
    const byId = new Map(suite.results.map(result => [result.caseId, result]));
    expect(byId.get("not-stated-versus-excluded")?.actual).toBe("pass");
    expect(byId.get("absence-is-not-charge")?.failures.map(f => f.code)).toContain("ABSENCE_AS_CHARGE");
    expect(byId.get("false-positive-risk-rejected")?.failures.map(f => f.code)).toContain("FALSE_POSITIVE_RISK");
    expect(byId.get("legitimate-material-concern")?.actual).toBe("pass");
    expect(byId.get("grounded-no-material-problem")?.actual).toBe("pass");
    expect(byId.get("uncertainty-preserved")?.actual).toBe("pass");
  });
});
