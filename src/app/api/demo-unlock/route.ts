import { NextRequest, NextResponse } from "next/server";
import { demoPaymentGateway, demoReportStore, DEMO_REPORT_SESSION_ID } from "@/lib/demo-access";
import { buildSafeAccessRedirect } from "@/lib/data-lifecycle";
import { beginOneTimeCheckout, confirmOneTimeCheckout } from "@/lib/report-access";

export async function POST(request: NextRequest) {
  try {
    const checkout = await beginOneTimeCheckout(
      demoReportStore,
      demoPaymentGateway,
      DEMO_REPORT_SESSION_ID,
    );

    if (!checkout) {
      return NextResponse.redirect(
        buildSafeAccessRedirect(request.url, "unknown-session", "report"),
        303,
      );
    }

    const record = await confirmOneTimeCheckout(
      demoReportStore,
      demoPaymentGateway,
      DEMO_REPORT_SESSION_ID,
      checkout.checkoutId,
    );

    const unlocked = record?.access === "unlocked";
    return NextResponse.redirect(
      buildSafeAccessRedirect(
        request.url,
        unlocked ? "unlocked" : "locked",
        unlocked ? "full-report" : "report",
      ),
      303,
    );
  } catch {
    return NextResponse.redirect(
      buildSafeAccessRedirect(request.url, "locked", "report"),
      303,
    );
  }
}
