import { describe, expect, it } from "vitest";
import { noConcernReport } from "../src/fixtures/report";
import { findingLabels, summarizeGutCheck, trustSafeFindingText } from "../src/lib/trust";
import type { Finding } from "../src/lib/types";

describe("finding taxonomy", () => {
  it("renders all required finding types", () => {
    expect(Object.keys(findingLabels).sort()).toEqual(["difference", "explicit_fact", "inference", "not_stated", "potential_risk"].sort());
  });
});

describe("not-stated trust behavior", () => {
  it("preserves careful language", () => {
    const finding: Finding = { id:"x", type:"not_stated", severity:"attention", title:"Disposal", plainLanguageExplanation:"The quote does not state whether disposal is included. This is a question to clarify, not proof of a charge.", affectedQuoteIds:["a"], evidenceRefs:[], confidence:.8, questionsToAsk:[] };
    expect(trustSafeFindingText(finding)).toContain("not proof of a charge");
  });

  it("replaces unsafe not-stated claims rather than asserting an extra charge", () => {
    const finding: Finding = { id:"x", type:"not_stated", severity:"attention", title:"Disposal", plainLanguageExplanation:"Disposal is an extra charge.", affectedQuoteIds:["a"], evidenceRefs:[], confidence:.8, questionsToAsk:[] };
    expect(trustSafeFindingText(finding)).toContain("not proof of an additional charge");
  });
});

describe("no material concern", () => {
  it("can explicitly report that no material concern is apparent", () => {
    expect(summarizeGutCheck(noConcernReport)).toMatch(/No material concern is apparent/);
  });
});
