import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { demoReport } from "../src/fixtures/report";
import {
  bindSuccessfulGeneratedAnalysis,
  GENERATED_REPORT_SESSION_COOKIE,
  getGeneratedReport,
  saveGeneratedReport,
  unlockGeneratedReportSession,
} from "../src/lib/generated-report-access";
import type { RealQuoteAnalysisResult } from "../src/lib/real-analysis";
import type { QuoteReport } from "../src/lib/types";

function generatedReport(label: string): QuoteReport {
  return { ...structuredClone(demoReport), overallGutCheck: label };
}

describe("CP13-04 generated report binding", () => {
  it("stores the exact generated report under its returned session and isolates sessions", async () => {
    await saveGeneratedReport("cp13-session-a", generatedReport("Generated report A"));
    await saveGeneratedReport("cp13-session-b", generatedReport("Generated report B"));

    expect((await getGeneratedReport("cp13-session-a"))?.report.overallGutCheck).toBe("Generated report A");
    expect((await getGeneratedReport("cp13-session-b"))?.report.overallGutCheck).toBe("Generated report B");
    expect((await getGeneratedReport("cp13-session-a"))?.access).toBe("locked");
  });

  it("behaviorally binds successful analysis to the exact returned session and cookie", async () => {
    const setSessionCookie = vi.fn();
    const result: RealQuoteAnalysisResult = {
      ok: true,
      reportSessionId: "cp13-success-session",
      report: generatedReport("Exact successful analysis"),
      sources: [],
    };

    const stored = await bindSuccessfulGeneratedAnalysis(result, setSessionCookie);

    expect(stored?.reportSessionId).toBe("cp13-success-session");
    expect(stored?.report.overallGutCheck).toBe("Exact successful analysis");
    expect((await getGeneratedReport("cp13-success-session"))?.report.overallGutCheck).toBe("Exact successful analysis");
    expect(setSessionCookie).toHaveBeenCalledOnce();
    expect(setSessionCookie).toHaveBeenCalledWith("cp13-success-session");
  });

  it("behaviorally leaves no completed report or cookie on analysis/provider failure", async () => {
    const setSessionCookie = vi.fn();
    const result: RealQuoteAnalysisResult = {
      ok: false,
      reportSessionId: "cp13-provider-failure-session",
      error: {
        code: "SOURCE_EXTRACTION_FAILED",
        message: "Image text extraction provider is required.",
        retryable: true,
        sourceCode: "IMAGE_PROVIDER_REQUIRED",
      },
    };

    expect(await bindSuccessfulGeneratedAnalysis(result, setSessionCookie)).toBeNull();
    expect(await getGeneratedReport("cp13-provider-failure-session")).toBeNull();
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("behaviorally keeps unlock on the exact generated session", async () => {
    await saveGeneratedReport("cp13-unlock-a", generatedReport("Unlock A"));
    await saveGeneratedReport("cp13-unlock-b", generatedReport("Unlock B"));

    const unlocked = await unlockGeneratedReportSession("cp13-unlock-a");

    expect(unlocked?.reportSessionId).toBe("cp13-unlock-a");
    expect(unlocked?.access).toBe("unlocked");
    expect(unlocked?.report.overallGutCheck).toBe("Unlock A");
    expect((await getGeneratedReport("cp13-unlock-a"))?.access).toBe("unlocked");
    expect((await getGeneratedReport("cp13-unlock-b"))?.access).toBe("locked");
    expect((await getGeneratedReport("cp13-unlock-b"))?.report.overallGutCheck).toBe("Unlock B");
  });

  it("behaviorally treats missing and unknown sessions as no completed report", async () => {
    expect(await getGeneratedReport(null)).toBeNull();
    expect(await getGeneratedReport("cp13-does-not-exist")).toBeNull();
    expect(await unlockGeneratedReportSession(null)).toBeNull();
    expect(await unlockGeneratedReportSession("cp13-does-not-exist")).toBeNull();
  });

  it("keeps server-scoped binding with no demo substitution", () => {
    const analyze = readFileSync("src/app/api/analyze/route.ts", "utf8");
    const intake = readFileSync("src/components/QuoteIntake.tsx", "utf8");
    const page = readFileSync("src/app/page.tsx", "utf8");
    const report = readFileSync("src/components/Report.tsx", "utf8");

    expect(GENERATED_REPORT_SESSION_COOKIE).toBe("quotecheck-report-session");
    expect(analyze).toContain("bindSuccessfulGeneratedAnalysis(result");
    expect(analyze).toContain("response.cookies.set(GENERATED_REPORT_SESSION_COOKIE, reportSessionId");
    expect(analyze).toContain("httpOnly: true");
    expect(intake).toContain('window.location.assign("/#report")');
    expect(page).toContain("cookieStore.get(GENERATED_REPORT_SESSION_COOKIE)?.value");
    expect(page).toContain("getGeneratedReport(reportSessionId)");
    expect(page).toContain("report={record.report}");
    expect(page).not.toContain("params.reportSessionId");
    expect(report).not.toContain('from "@/fixtures/report"');
    expect(report).not.toContain("reportPresentationModel(demoReport");
    expect(report).not.toContain('name="reportSessionId"');
  });

  it("preserves critical accessible report relationships", () => {
    const report = readFileSync("src/components/Report.tsx", "utf8");

    expect(report).toContain('aria-labelledby="report-title"');
    expect(report).toContain('aria-label={unlocked ? "Full report unlocked" : "Free preview"}');
    expect(report).toContain('aria-label="QuoteCheck report framing"');
    expect(report).toContain('aria-labelledby="gut-check-title"');
    expect(report).toContain('aria-labelledby="compare-quotes-title"');
    expect(report).toContain('aria-labelledby="findings-title"');
    expect(report).toContain('aria-labelledby={`${section.id}-title`}');
    expect(report).toContain('aria-labelledby="unlock-title"');
    expect(report).toContain('aria-labelledby="unlocked-title"');
    expect(report).toContain('aria-labelledby="limitations-title"');
  });
});
