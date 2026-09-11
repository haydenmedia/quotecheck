import { describe, expect, it } from "vitest";
import { ingestionFixtures } from "@/fixtures/ingestion";
import { ingestTextQuote } from "@/lib/ingestion";
import { DOMAIN_PACKS, getDomainPack } from "@/lib/domain-packs";
import { DeterministicReasoningProvider } from "@/lib/reasoning";
import type { QuoteCategory } from "@/lib/types";

const quote = (key: keyof typeof ingestionFixtures) => ingestTextQuote(ingestionFixtures[key]).quote;
const run = async (keys: (keyof typeof ingestionFixtures)[], category: QuoteCategory = "general") => {
  const provider = new DeterministicReasoningProvider();
  return provider.analyze({ quotes: keys.map(quote), category, domain: getDomainPack(category) });
};

describe("grounded deterministic reasoning", () => {
  it("selects versioned domain context packs without provider identity in product logic", () => {
    expect(Object.keys(DOMAIN_PACKS).sort()).toEqual(["automotive", "general", "renovation", "trades"]);
    expect(getDomainPack("automotive").id).toBe("automotive-v1");
    expect(getDomainPack("renovation").trustNotes.join(" ")).toMatch(/do not assume/i);
  });

  it("can generate all five finding types from grounded fixtures", async () => {
    const report = await run(["clean", "missingFields", "ambiguous", "arithmeticMismatch"]);
    const types = new Set(report.findings.map((finding) => finding.type));
    expect(types).toEqual(new Set(["explicit_fact", "difference", "not_stated", "potential_risk", "inference"]));
  });

  it("keeps explicit exclusion distinct from omission", async () => {
    const report = await run(["explicitExclusion", "missingFields"]);
    const exclusion = report.findings.find((finding) => finding.id.startsWith("exclusion-"));
    expect(exclusion?.type).toBe("explicit_fact");
    expect(exclusion?.evidenceRefs.length).toBeGreaterThan(0);
    const omissions = report.findings.filter((finding) => finding.type === "not_stated");
    expect(omissions.length).toBeGreaterThan(0);
    expect(omissions.every((finding) => /does not mean a charge, exclusion, or problem exists/i.test(finding.plainLanguageExplanation))).toBe(true);
  });

  it("preserves unreadable and ambiguous evidence without upgrading certainty", async () => {
    const report = await run(["ambiguous", "unreadable"]);
    const uncertain = report.findings.filter((finding) => finding.type === "inference");
    expect(uncertain.length).toBeGreaterThan(0);
    expect(uncertain.every((finding) => /no stronger claim is justified|uncertainty needs clarification/i.test(finding.plainLanguageExplanation + " " + finding.title))).toBe(true);
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
    const provider = new DeterministicReasoningProvider();
    const report = await provider.analyze({ quotes: [first, second], category: "general", domain: getDomainPack("general") });
    expect(report.noMaterialConcern).toBe(true);
    expect(report.overallGutCheck).toMatch(/no material concern/i);
    expect(report.findings.some((finding) => finding.type === "potential_risk" || finding.type === "inference" || finding.type === "not_stated")).toBe(false);
  });
});
