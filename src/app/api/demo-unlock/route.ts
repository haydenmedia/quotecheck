import { NextRequest, NextResponse } from "next/server";
import { demoPaymentGateway, demoReportStore, DEMO_REPORT_SESSION_ID } from "@/lib/demo-access";
import { beginOneTimeCheckout, confirmOneTimeCheckout } from "@/lib/report-access";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const reportSessionId = String(form.get("reportSessionId") ?? "");
  const destination = new URL("/", request.url);

  if (reportSessionId !== DEMO_REPORT_SESSION_ID) {
    destination.searchParams.set("access", "unknown-session");
    destination.hash = "report";
    return NextResponse.redirect(destination, 303);
  }

  const checkout = await beginOneTimeCheckout(demoReportStore, demoPaymentGateway, reportSessionId);
  if (!checkout) {
    destination.searchParams.set("access", "unknown-session");
    destination.hash = "report";
    return NextResponse.redirect(destination, 303);
  }

  const record = await confirmOneTimeCheckout(
    demoReportStore,
    demoPaymentGateway,
    reportSessionId,
    checkout.checkoutId,
  );

  destination.searchParams.set("session", reportSessionId);
  destination.searchParams.set("access", record?.access === "unlocked" ? "unlocked" : "locked");
  destination.hash = record?.access === "unlocked" ? "full-report" : "report";
  return NextResponse.redirect(destination, 303);
}
