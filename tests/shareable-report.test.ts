import { describe, expect, it } from "vitest";
import { demoReport, noConcernReport } from "../src/fixtures/report";
import { reportPresentationModel, reportSurface } from "../src/lib/report-presentation";

describe("shareable grounded report presentation", () => {
  it("uses one presentation boundary for web and print consumers", () => {
    expect(reportSurface).toBe(reportPresentationModel);
    const model = reportPresentationModel(demoReport, true);
    expect(model.quotes).toHaveLength(demoReport.quotes.length);
    expect(model.sections.map((section) => section.id)).toEqual(demoReport.sections.map((section) => section.id));
  });

  it("does not expose locked full-report findings in preview presentation state", () => {
    const preview = reportPresentationModel(demoReport, false);
    const full = reportPresentationModel(demoReport, true);
    const lockedIds = new Set(demoReport.sections.filter((section) => section.locked).map((section) => section.id));

    expect(preview.access).toBe("preview");
    expect(full.access).toBe("full");
    expect(preview.sections.some((section) => lockedIds.has(section.id))).toBe(false);
    expect(full.sections.some((section) => lockedIds.has(section.id))).toBe(true);
  });

  it("preserves grounded taxonomy, uncertainty and source evidence", () => {
    const model = reportPresentationModel(demoReport, true);
    const findings = model.sections.flatMap((section) => section.findings);
    const omitted = findings.find((finding) => finding.id === "f3")!;
    const excluded = findings.find((finding) => finding.id === "f6")!;

    expect(omitted.typeLabel).toBe("Not stated");
    expect(omitted.scopeStatusLabel).toBe("Not stated");
    expect(omitted.body).toContain("not proof of an additional charge");
    expect(excluded.scopeStatusLabel).toBe("Explicitly excluded");
    expect(findings.some((finding) => finding.evidence.length > 0)).toBe(true);
  });

  it("preserves a valid no-material-concern output", () => {
    const model = reportPresentationModel(noConcernReport, true);
    expect(model.noMaterialConcern).toBe(true);
    expect(model.headline.title).toBe("Nothing material stands out");
    expect(model.headline.body).toContain("No material concern is apparent");
  });

  it("keeps private runtime, provider, payment and session fields outside the presentation model", () => {
    const serialized = JSON.stringify(reportPresentationModel(demoReport, true));
    for (const forbidden of ["reportSessionId", "sessionId", "providerConfig", "providerName", "modelId", "apiKey", "paymentIntent", "checkoutSession"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("includes concise second-opinion framing in the shareable model", () => {
    const framing = reportPresentationModel(demoReport, true).shareFraming;
    expect(framing.title).toContain("second opinion");
    expect(framing.disclaimer).toContain("not a professional appraisal");
    expect(framing.disclaimer).toContain("legal opinion");
  });
});
