import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoReport } from "../src/fixtures/report";
import { launchCategories, launchExample, launchJourney, launchTrustPoints } from "../src/lib/launch-readiness";
import { reportPresentationModel } from "../src/lib/report-presentation";

describe("CP12 launch-readiness model", () => {
  it("keeps the initial category scope bounded", () => {
    expect(launchCategories).toEqual([
      "General",
      "Automotive",
      "Renovation",
      "Trades / Home Services",
    ]);
  });

  it("states the commercial journey without subscription or guarantee claims", () => {
    expect(launchJourney.map((step) => step.title)).toEqual([
      "Add 2–3 quotes",
      "Get a useful free preview",
      "Unlock once for CA$14.99",
      "Review the grounded full report",
    ]);
    expect(launchJourney.some((step) => step.body.includes("No subscription"))).toBe(true);
    expect(JSON.stringify(launchJourney).toLowerCase()).not.toContain("guarantee");
  });

  it("describes implemented trust semantics rather than accuracy or savings promises", () => {
    const copy = JSON.stringify(launchTrustPoints).toLowerCase();
    expect(copy).toContain("not stated");
    expect(copy).toContain("excluded");
    expect(copy).toContain("possibilities");
    expect(copy).toContain("nothing material");
    expect(copy).not.toContain("save money");
    expect(copy).not.toContain("accurate");
  });

  it("keeps the launch education example explicitly static and preview-only", () => {
    expect(launchExample.eyebrow).toBe("Static example");
    expect(launchExample.body).toContain("deterministic fixture data");

    const preview = reportPresentationModel(demoReport, false);
    const full = reportPresentationModel(demoReport, true);
    expect(preview.access).toBe("preview");
    expect(preview.sections.length).toBeLessThan(full.sections.length);
  });

  it("keeps the static-example label separate from the three mobile metric columns", () => {
    const css = readFileSync("src/app/cp12.css", "utf8");
    expect(css).toContain("@media(max-width:760px)");
    expect(css).toContain(".hero-proof>.example-label{grid-column:1/-1");
  });
});
