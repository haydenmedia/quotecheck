import { NextRequest, NextResponse } from "next/server";
import { generatedPaymentGateway, generatedReportStore } from "@/lib/generated-report-access";
import { beginOneTimeCheckout, confirmOneTimeCheckout } from "@/lib/report-access";

function reportRedirect(
  requestUrl: string,
  reportSessionId: string,
  access: "unlocked" | "locked" | "unknown-session",
  hash: "report" | "full-report",
) {
  const destination = new URL("/", requestUrl);
  destination.searchParams.set("reportSessionId", reportSessionId);
  destination.searchParams.set("access", access);
  destination.hash = hash;
  return destination;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const reportSessionId = form.get("reportSessionId");

  if (typeof reportSessionId !== "string" || !reportSessionId.trim()) {
    return NextResponse.redirect(new URL("/#compare", request.url), 303);
  }

  try {
    const checkout = await beginOneTimeCheckout(
      generatedReportStore,
      generatedPaymentGateway,
      reportSessionId,
    );

    if (!checkout) {
      return NextResponse.redirect(
        reportRedirect(request.url, reportSessionId, "unknown-session", "report"),
        303,
      );
    }

    const record = await confirmOneTimeCheckout(
      generatedReportStore,
      generatedPaymentGateway,
      reportSessionId,
      checkout.checkoutId,
    );
    const unlocked = record?.access === "unlocked";

    return NextResponse.redirect(
      reportRedirect(
        request.url,
        reportSessionId,
        unlocked ? "unlocked" : "locked",
        unlocked ? "full-report" : "report",
      ),
      303,
    );
  } catch {
    return NextResponse.redirect(
      reportRedirect(request.url, reportSessionId, "locked", "report"),
      303,
    );
  }
}
