import { describe, expect, it } from "vitest";
import { ingestionFixtures } from "../src/fixtures/ingestion";
import { ingestTextQuote } from "../src/lib/ingestion";
import { DOMAIN_PACKS, getDomainPack } from "../src/lib/domain-packs";
import { DeterministicReasoningProvider, formatQuoteTotal } from "../src/lib/reasoning";
import type { Certainty, QuoteCategory, SourcedValue } from "../src/lib/types";

const quote = (key: keyof typeof ingestionFixtures) => ingestTextQuote(ingestionFixtures[key]).quote;
const run = async (keys: (keyof typeof ingestionFixtures)[], category: QuoteCategory = "general") => {
  const provider = new DeterministicReasoningProvider();
  return provider.analyze({ quotes: keys.map(quote), category, domain: getDomainPack(category) });
};
const evidence = (quoteId: string, excerpt: string) => [{ quoteId, sourceLabel: "Regression fixture", excerpt, confidence: 0.5 }];

describe("grounded deterministic reasoning", () => {
  it("selects versioned domain context packs without provider identity in product logic", () => {
    expect(Object.keys(DOMAIN_PACKS).sort()).toEqual(["automotive", "general", "renovation", "trades"]);
    expect(getDomainPack("automotive").id).toBe("automotive-v1");
    expect(getDomainPack("renovation").trustNotes.join(" ")).toMatch(/do not assume/i);
  });

  it("can generate all five finding types from grounded fixtures", async () => {
    const report = await run(["clean", "missingFields", "ambiguous", "arithmeticMismatch"]);
    expect(new Set(report.findings.map((finding) => finding.type))).toEqual(new Set(["explicit_fact", "difference", "not_stated", "potential_risk", "inference"]));
  });

  it("keeps explicit exclusion distinct from omission", async () => {
    const report = await run(["explicitExclusion", "missingFields"]);
    const exclusion = report.findings.find((finding) => finding.id.startsWith("exclusion-"));
    expect(exclusion?.type).toBe("explicit_fact");
    expect(exclusion?.evidenceRefs.length).toBeGreaterThan(0);
    expect(report.findings.filter((finding) => finding.type === "not_stated").every((finding) => /does not mean a charge, exclusion, or problem exists/i.test(finding.plainLanguageExplanation))).toBe(true);
  });

  it("preserves unreadable and ambiguous evidence without upgrading certainty", async () => {
    const report = await run(["ambiguous", "unreadable"]);
    const uncertain = report.findings.filter((finding) => finding.type === "inference");
    expect(uncertain.length).toBeGreaterThan(0);
    expect(uncertain.every((finding) => /no stronger claim is justified|uncertainty needs clarification/i.test(finding.plainLanguageExplanation + " " + finding.title))).toBe(true);
  });

  it("preserves every surfaced canonical field family across the four certainty states", async () => {
    const states: Certainty[] = ["stated", "not_stated", "ambiguous", "unreadable"];
    for (const certainty of states) {
      const source = quote("clean");
      const id = `matrix-${certainty}`;
      const text = (label: string): SourcedValue<string> => ({ value: certainty === "stated" || certainty === "ambiguous" ? `${label} value` : null, certainty, evidence: certainty === "not_stated" ? [] : evidence(id, `${label} evidence`) });
      const number: SourcedValue<number> = ({ value: certainty === "stated" || certainty === "ambiguous" ? 1234 : null, certainty, evidence: certainty === "not_stated" ? [] : evidence(id, "total evidence") });
      const candidate = { ...source, id, vendor: text("vendor"), money: { ...source.money, total: number }, inclusions: [text("inclusion")], exclusions: [text("exclusion")], warranty: text("warranty"), timeline: text("timeline"), paymentTerms: text("payment") };
      const report = await new DeterministicReasoningProvider().analyze({ quotes: [candidate], category: "general", domain: getDomainPack("general") });
      const summary = report.quotes[0];
      for (const field of [summary.vendor, summary.total, summary.scopeIncluded[0], summary.scopeExcluded[0], summary.warranty, summary.timeline, summary.paymentTerms]) {
        expect(field.certainty).toBe(certainty);
        if (certainty === "not_stated") expect(field.evidence).toEqual([]);
        else expect(field.evidence[0]?.excerpt).toBeTruthy();
      }
    }
  });

  it("preserves a not-stated total as unknown instead of manufacturing zero", async () => {
    const source = quote("clean");
    const missingTotal = { ...source, id: "quote-total-not-stated", money: { ...source.money, total: { value: null, certainty: "not_stated" as const, evidence: [] } } };
    const report = await new DeterministicReasoningProvider().analyze({ quotes: [missingTotal], category: "general", domain: getDomainPack("general") });
    expect(report.quotes[0].total.certainty).toBe("not_stated");
    expect(report.quotes[0].total.value).toBeNull();
    expect(formatQuoteTotal(report.quotes[0].total)).toBe("Not stated");
    expect(formatQuoteTotal(report.quotes[0].total)).not.toBe("$0.00");
  });

  it("preserves an unreadable total and its evidence instead of calling it not stated", async () => {
    const source = quote("clean");
    const unreadableTotal = { ...source, id: "quote-total-unreadable", money: { ...source.money, total: { value: null, certainty: "unreadable" as const, evidence: evidence("quote-total-unreadable", "Total: [unreadable]") } } };
    const report = await new DeterministicReasoningProvider().analyze({ quotes: [unreadableTotal], category: "general", domain: getDomainPack("general") });
    expect(report.quotes[0].total.certainty).toBe("unreadable");
    expect(report.quotes[0].total.evidence[0].excerpt).toContain("unreadable");
    expect(formatQuoteTotal(report.quotes[0].total)).toMatch(/could not reliably read/i);
    expect(formatQuoteTotal(report.quotes[0].total)).not.toBe("Not stated");
    expect(report.findings.some((finding) => /states a total of \$0\.00/i.test(finding.title))).toBe(false);
  });

  it("propagates arithmetic warnings as qualified potential risk with source evidence", async () => {
    const report = await run(["arithmeticMismatch"]);
    const risk = report.findings.find((finding) => finding.type === "potential_risk");
    expect(risk?.title).toMatch(/arithmetic needs clarification/i);
    expect(risk?.evidenceRefs.length).toBeGreaterThan(0);
    expect(risk?.questionsToAsk.length).toBeGreaterThan(0);
  });

  it("grounds fact-dependent findings to affected quote IDs and resolvable evidence", async () => {
    const report = await run(["clean", "explicitExclusion"]);
    const grounded = report.findings.filter((finding) => finding.type === "explicit_fact" || finding.type === "difference");
    expect(grounded.length).toBeGreaterThan(0);
    for (const finding of grounded) {
      expect(finding.affectedQuoteIds.length).toBeGreaterThan(0);
      expect(finding.evidenceRefs.length).toBeGreaterThan(0);
      expect(finding.evidenceRefs.every((ref) => finding.affectedQuoteIds.includes(ref.quoteId))).toBe(true);
      expect(finding.evidenceRefs.every((ref) => ref.excerpt.trim().length > 0)).toBe(true);
    }
  });

  it("allows a no-material-concern outcome instead of manufacturing warnings", async () => {
    const first = quote("noConcern");
    const second = { ...first, id: "quote-no-concern-copy", sourceInputIds: ["no-concern-copy"], vendor: { ...first.vendor, value: "Summit Mechanical" } };
    const report = await new DeterministicReasoningProvider().analyze({ quotes: [first, second], category: "general", domain: getDomainPack("general") });
    expect(report.noMaterialConcern).toBe(true);
    expect(report.overallGutCheck).toMatch(/no material concern/i);
    expect(report.findings.some((finding) => finding.type === "potential_risk" || finding.type === "inference" || finding.type === "not_stated")).toBe(false);
  });
});
