import { describe, expect, it } from "vitest";
import { demoReport, noConcernReport, scopeUncertaintyFixtureV1, systemicUncertaintyFixtureV1, termUncertaintyFixtureV1 } from "../src/fixtures/report";
import { findingLabels } from "../src/lib/trust";
import { presentFinding, presentQuoteSummary, reportHeadline, visibleSections } from "../src/lib/report-presentation";
import type { Certainty, ReportSummaryValue } from "../src/lib/types";

const evidence = [{ quoteId: "matrix", sourceLabel: "Regression fixture", excerpt: "uncertain source", confidence: 0.5 }];

describe("grounded report presentation", () => {
  it("renders true unknown totals as Not stated rather than zero", () => {
    const quote = { ...demoReport.quotes[0], total: { value: null, certainty: "not_stated" as const, evidence: [] } };
    expect(presentQuoteSummary(quote).totalLabel).toBe("Not stated");
    expect(presentQuoteSummary(quote).totalLabel).not.toContain("$0");
  });

  it("does not flatten ambiguous vendor or unreadable total into clean values", () => {
    const view = presentQuoteSummary(systemicUncertaintyFixtureV1.quotes[0]);
    expect(view.vendorDetail.certainty).toBe("ambiguous");
    expect(view.vendorDetail.label).toContain("Possibly Acme");
    expect(view.vendorDetail.evidence[0]).toContain("Acme?");
    expect(view.totalDetail.certainty).toBe("unreadable");
    expect(view.totalDetail.label).toMatch(/could not reliably read/i);
    expect(view.totalDetail.label).not.toBe("Not stated");
    expect(view.totalDetail.evidence[0]).toContain("Total: [unreadable]");
  });

  it("presents every surfaced scalar field distinctly across all four certainty states", () => {
    const states: Certainty[] = ["stated", "not_stated", "ambiguous", "unreadable"];
    for (const certainty of states) {
      const text: ReportSummaryValue<string> = { value: certainty === "stated" || certainty === "ambiguous" ? "Example" : null, certainty, evidence: certainty === "not_stated" ? [] : evidence };
      const total: ReportSummaryValue<number> = { value: certainty === "stated" || certainty === "ambiguous" ? 123 : null, certainty, evidence: certainty === "not_stated" ? [] : evidence };
      const view = presentQuoteSummary({ ...demoReport.quotes[0], vendor: text, total, warranty: text, timeline: text, paymentTerms: text });
      for (const field of [view.vendorDetail, view.totalDetail, view.warrantyDetail, view.timelineDetail, view.paymentTermsDetail]) {
        expect(field.certainty).toBe(certainty);
        if (certainty === "not_stated") expect(field.label).toBe("Not stated");
        if (certainty === "ambiguous") expect(field.certaintyLabel).toBe("Ambiguous");
        if (certainty === "unreadable") expect(field.label).toMatch(/could not reliably read/i);
      }
    }
  });

  it("presents per-quote scope while keeping explicit exclusions distinct from omissions", () => {
    const stated = presentQuoteSummary(demoReport.quotes[0]);
    const omitted = presentQuoteSummary(demoReport.quotes[1]);
    expect(stated.scopeIncludedDetails.map((item) => item.label)).toContain("Demolition");
    expect(stated.scopeExcludedDetails.map((item) => item.label)).toContain("Permit fees");
    expect(omitted.scopeExcludedDetails.map((item) => item.label)).toEqual(["Not stated"]);
  });

  it("keeps ambiguous and unreadable scope visibly uncertain with source evidence", () => {
    const uncertain = presentQuoteSummary(scopeUncertaintyFixtureV1.quotes[0]);
    expect(uncertain.scopeIncludedDetails[0].certainty).toBe("ambiguous");
    expect(uncertain.scopeIncludedDetails[0].evidence[0]).toContain("Prep incl.?");
    expect(uncertain.scopeExcludedDetails[0].certainty).toBe("unreadable");
    expect(uncertain.scopeExcludedDetails[0].label).toMatch(/could not reliably read/i);
    expect(uncertain.scopeExcludedDetails[0].label).not.toBe("Not stated");
  });

  it("keeps term certainty states distinct and grounded", () => {
    const uncertain = presentQuoteSummary(termUncertaintyFixtureV1.quotes[0]);
    expect(uncertain.warrantyDetail.certainty).toBe("ambiguous");
    expect(uncertain.warrantyDetail.label).toContain("Possibly 2 years");
    expect(uncertain.timelineDetail.certainty).toBe("unreadable");
    expect(uncertain.timelineDetail.label).toMatch(/could not reliably read/i);
    expect(uncertain.paymentTermsDetail.certainty).toBe("not_stated");
    expect(uncertain.paymentTermsDetail.label).toBe("Not stated");
  });

  it("keeps explicit exclusion distinct from omission in findings", () => {
    const omitted = demoReport.findings.find((finding) => finding.id === "f3")!;
    const excluded = demoReport.findings.find((finding) => finding.id === "f6")!;
    expect(presentFinding(omitted).scopeStatusLabel).toBe("Not stated");
    expect(presentFinding(excluded).scopeStatusLabel).toBe("Explicitly excluded");
    expect(presentFinding(omitted).body).toContain("not proof of an additional charge");
  });

  it("presents a calm no-material-concern state", () => {
    const headline = reportHeadline(noConcernReport);
    expect(headline.tone).toBe("calm");
    expect(headline.title).toBe("Nothing material stands out");
    expect(headline.body).toContain("No material concern is apparent");
  });

  it("keeps all finding taxonomy labels user-visible", () => {
    expect(findingLabels).toEqual({ explicit_fact: "Explicit fact", difference: "Difference", not_stated: "Not stated", potential_risk: "Potential risk", inference: "Inference" });
  });

  it("keeps the free preview open while locking full-report sections", () => {
    const preview = visibleSections(demoReport, false);
    const unlocked = visibleSections(demoReport, true);
    expect(preview.find((section) => section.id === "standout")?.isLocked).toBe(false);
    expect(preview.find((section) => section.id === "costs")?.isLocked).toBe(true);
    expect(unlocked.every((section) => section.isLocked === false)).toBe(true);
  });

  it("keeps grounded evidence available for factual findings", () => {
    const factual = demoReport.findings.find((finding) => finding.id === "f1")!;
    const view = presentFinding(factual);
    expect(view.evidence[0]).toContain("Quote page 2");
    expect(view.evidence[0]).toContain("3 year workmanship warranty");
  });
});
