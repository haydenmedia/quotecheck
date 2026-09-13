import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoReport } from "../src/fixtures/report";
import {
  GENERATED_REPORT_SESSION_COOKIE,
  getGeneratedReport,
  saveGeneratedReport,
} from "../src/lib/generated-report-access";
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

  it("binds analysis success to the exact returned session with no demo substitution", () => {
    const analyze = readFileSync("src/app/api/analyze/route.ts", "utf8");
    const intake = readFileSync("src/components/QuoteIntake.tsx", "utf8");
    const page = readFileSync("src/app/page.tsx", "utf8");
    const report = readFileSync("src/components/Report.tsx", "utf8");

    expect(GENERATED_REPORT_SESSION_COOKIE).toBe("quotecheck-report-session");
    expect(analyze).toContain("saveGeneratedReport(result.reportSessionId, result.report)");
    expect(analyze).toContain("response.cookies.set(GENERATED_REPORT_SESSION_COOKIE, result.reportSessionId");
    expect(analyze).toContain("httpOnly: true");
    expect(intake).toContain('window.location.assign("/#report")');
    expect(page).toContain("cookieStore.get(GENERATED_REPORT_SESSION_COOKIE)?.value");
    expect(page).toContain("getGeneratedReport(reportSessionId)");
    expect(page).toContain("report={record.report}");
    expect(report).not.toContain('from "@/fixtures/report"');
    expect(report).not.toContain("reportPresentationModel(demoReport");
  });

  it("keeps the same generated session server-scoped across preview and unlock", () => {
    const report = readFileSync("src/components/Report.tsx", "utf8");
    const unlock = readFileSync("src/app/api/report-unlock/route.ts", "utf8");
    const page = readFileSync("src/app/page.tsx", "utf8");

    expect(unlock).toContain("request.cookies.get(GENERATED_REPORT_SESSION_COOKIE)?.value");
    expect(page).not.toContain("params.reportSessionId");
    expect(report).not.toContain('name="reportSessionId"');
    expect(report).not.toContain("reportSessionId:");
    expect(page).not.toContain("DEMO_REPORT_SESSION_ID");
  });
});
