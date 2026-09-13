import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoReport } from "../src/fixtures/report";
import { getGeneratedReport, saveGeneratedReport } from "../src/lib/generated-report-access";
import type { QuoteReport } from "../src/lib/types";

describe("CP13-04 generated report binding", () => {
  it("stores the exact generated report under its returned session and isolates sessions", async () => {
    const reportA: QuoteReport = { ...structuredClone(demoReport), overallGutCheck: "Generated report A" };
    const reportB: QuoteReport = { ...structuredClone(demoReport), overallGutCheck: "Generated report B" };

    await saveGeneratedReport("cp13-session-a", reportA);
    await saveGeneratedReport("cp13-session-b", reportB);

    expect((await getGeneratedReport("cp13-session-a"))?.report.overallGutCheck).toBe("Generated report A");
    expect((await getGeneratedReport("cp13-session-b"))?.report.overallGutCheck).toBe("Generated report B");
    expect((await getGeneratedReport("cp13-session-a"))?.access).toBe("locked");
  });

  it("binds analysis success to the exact returned report session with no demo report substitution", () => {
    const intake = readFileSync("src/components/QuoteIntake.tsx", "utf8");
    const page = readFileSync("src/app/page.tsx", "utf8");
    const report = readFileSync("src/components/Report.tsx", "utf8");

    expect(intake).toContain("reportSessionId=${encodeURIComponent(result.reportSessionId)}");
    expect(page).toContain("getGeneratedReport(reportSessionId)");
    expect(page).toContain("report={record.report}");
    expect(report).not.toContain('from "@/fixtures/report"');
    expect(report).not.toContain("reportPresentationModel(demoReport");
  });

  it("preserves the same session across preview and unlock and exposes no completed fallback for missing sessions", () => {
    const report = readFileSync("src/components/Report.tsx", "utf8");
    const unlock = readFileSync("src/app/api/report-unlock/route.ts", "utf8");
    const page = readFileSync("src/app/page.tsx", "utf8");

    expect(report).toContain('name="reportSessionId" value={reportSessionId}');
    expect(unlock).toContain('destination.searchParams.set("reportSessionId", reportSessionId)');
    expect(page).toContain("reportSessionId && !record");
    expect(page).not.toContain("DEMO_REPORT_SESSION_ID");
  });
});
