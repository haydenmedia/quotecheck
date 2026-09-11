import { describe, expect, it } from "vitest";
import {
  demoReport,
  noConcernReport,
  scopeUncertaintyFixtureV1,
  systemicUncertaintyFixtureV1,
  termUncertaintyFixtureV1,
} from "../src/fixtures/report";
import { demoUnlockCopy, reportSurface } from "../src/lib/report-presentation";

describe("CP5 deterministic preview gate", () => {
  it("shows a useful bounded preview while omitting every locked section", () => {
    const preview = reportSurface(demoReport, false);

    expect(preview.access).toBe("preview");
    expect(preview.headline.body).toContain("Cedar");
    expect(preview.quotes).toHaveLength(3);
    expect(preview.sections.map((section) => section.id)).toEqual(["standout"]);
    expect(preview.sections[0].findings.map((finding) => finding.id)).toEqual(["f1", "f2"]);
  });

  it("does not serialize gated finding content into the preview presentation surface", () => {
    const previewJson = JSON.stringify(reportSurface(demoReport, false));
    const lockedFindingIds = new Set(
      demoReport.sections
        .filter((section) => section.locked)
        .flatMap((section) => section.findingIds),
    );

    for (const finding of demoReport.findings.filter((item) => lockedFindingIds.has(item.id))) {
      if (demoReport.sections.some((section) => !section.locked && section.findingIds.includes(finding.id))) continue;
      expect(previewJson).not.toContain(finding.title);
      expect(previewJson).not.toContain(finding.plainLanguageExplanation);
      for (const evidence of finding.evidenceRefs) expect(previewJson).not.toContain(evidence.excerpt);
      for (const question of finding.questionsToAsk) expect(previewJson).not.toContain(question);
    }

    for (const section of demoReport.sections.filter((item) => item.locked)) {
      expect(previewJson).not.toContain(`\"title\":\"${section.title}\"`);
    }
  });

  it("unlocks the same already-produced report rather than generating a different analysis", () => {
    const preview = reportSurface(demoReport, false);
    const full = reportSurface(demoReport, true);

    expect(full.access).toBe("full");
    expect(full.headline).toEqual(preview.headline);
    expect(full.quotes).toEqual(preview.quotes);
    expect(full.sections.map((section) => section.id)).toEqual(demoReport.sections.map((section) => section.id));

    const fullFindingIds = new Set(full.sections.flatMap((section) => section.findings.map((finding) => finding.id)));
    for (const finding of demoReport.findings) expect(fullFindingIds.has(finding.id)).toBe(true);
  });

  it("uses one-time CA$14.99 demo pricing with no live payment state", () => {
    expect(demoUnlockCopy).toEqual({ price: "CA$14.99", cadence: "one-time", livePayment: false });
    expect(`${demoUnlockCopy.price} ${demoUnlockCopy.cadence}`.toLowerCase()).not.toMatch(/month|year|subscription/);
  });

  it("keeps a valid no-material-concern state useful in preview", () => {
    const preview = reportSurface(noConcernReport, false);

    expect(preview.noMaterialConcern).toBe(true);
    expect(preview.headline.title).toBe("Nothing material stands out");
    expect(preview.headline.body).toContain("No material concern is apparent");
    expect(preview.sections).toEqual([]);
    expect(preview.quotes).toHaveLength(3);
  });

  it("preserves uncertainty and exclusion semantics on the preview surface", () => {
    const systemic = reportSurface(systemicUncertaintyFixtureV1, false).quotes[0];
    expect(systemic.vendorDetail.certainty).toBe("ambiguous");
    expect(systemic.vendorDetail.evidence[0]).toContain("Acme?");
    expect(systemic.totalDetail.certainty).toBe("unreadable");
    expect(systemic.totalDetail.label).not.toBe("Not stated");

    const scope = reportSurface(scopeUncertaintyFixtureV1, false).quotes[0];
    expect(scope.scopeIncludedDetails[0].certainty).toBe("ambiguous");
    expect(scope.scopeExcludedDetails[0].certainty).toBe("unreadable");
    expect(scope.scopeExcludedDetails[0].label).not.toBe("Not stated");

    const terms = reportSurface(termUncertaintyFixtureV1, false).quotes[0];
    expect(terms.warrantyDetail.certainty).toBe("ambiguous");
    expect(terms.timelineDetail.certainty).toBe("unreadable");
    expect(terms.paymentTermsDetail.certainty).toBe("not_stated");
  });
});
