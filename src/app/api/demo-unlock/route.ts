import { NextRequest, NextResponse } from "next/server";
import { demoPaymentGateway, demoReportStore, DEMO_REPORT_SESSION_ID } from "@/lib/demo-access";
import { buildSafeAccessRedirect } from "@/lib/data-lifecycle";
import {
  PRIVATE_BETA_EVENT_VERSION,
  noopPrivateBetaInstrumentation,
  recordPrivateBetaEvent,
} from "@/lib/private-beta-instrumentation";
import { beginOneTimeCheckout, confirmOneTimeCheckout } from "@/lib/report-access";

export async function POST(request: NextRequest) {
  recordPrivateBetaEvent(noopPrivateBetaInstrumentation, {
    version: PRIVATE_BETA_EVENT_VERSION,
    name: "unlock_intent",
  });

  try {
    const checkout = await beginOneTimeCheckout(
      demoReportStore,
      demoPaymentGateway,
      DEMO_REPORT_SESSION_ID,
    );

    if (!checkout) {
      recordPrivateBetaEvent(noopPrivateBetaInstrumentation, {
        version: PRIVATE_BETA_EVENT_VERSION,
        name: "unlock_failed",
        reason: "UNKNOWN_SESSION",
      });
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
    recordPrivateBetaEvent(noopPrivateBetaInstrumentation, unlocked
      ? {
          version: PRIVATE_BETA_EVENT_VERSION,
          name: "unlock_succeeded",
        }
      : {
          version: PRIVATE_BETA_EVENT_VERSION,
          name: "unlock_failed",
          reason: "UNLOCK_NOT_CONFIRMED",
        });

    return NextResponse.redirect(
      buildSafeAccessRedirect(
        request.url,
        unlocked ? "unlocked" : "locked",
        unlocked ? "full-report" : "report",
      ),
      303,
    );
  } catch {
    recordPrivateBetaEvent(noopPrivateBetaInstrumentation, {
      version: PRIVATE_BETA_EVENT_VERSION,
      name: "unlock_failed",
      reason: "UNLOCK_EXCEPTION",
    });
    return NextResponse.redirect(
      buildSafeAccessRedirect(request.url, "locked", "report"),
      303,
    );
  }
}
