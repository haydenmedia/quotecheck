import { NextRequest, NextResponse } from "next/server";
import {
  GENERATED_REPORT_SESSION_COOKIE,
  unlockGeneratedReportSession,
} from "@/lib/generated-report-access";

function reportRedirect(
  requestUrl: string,
  access: "unlocked" | "locked" | "unknown-session",
  hash: "report" | "full-report",
) {
  const destination = new URL("/", requestUrl);
  destination.searchParams.set("access", access);
  destination.hash = hash;
  return destination;
}

export async function POST(request: NextRequest) {
  const reportSessionId = request.cookies.get(GENERATED_REPORT_SESSION_COOKIE)?.value ?? null;
  if (!reportSessionId) {
    return NextResponse.redirect(reportRedirect(request.url, "unknown-session", "report"), 303);
  }

  try {
    const record = await unlockGeneratedReportSession(reportSessionId);
    if (!record) {
      return NextResponse.redirect(reportRedirect(request.url, "unknown-session", "report"), 303);
    }

    const unlocked = record.access === "unlocked";
    return NextResponse.redirect(
      reportRedirect(request.url, unlocked ? "unlocked" : "locked", unlocked ? "full-report" : "report"),
      303,
    );
  } catch {
    return NextResponse.redirect(reportRedirect(request.url, "locked", "report"), 303);
  }
}
