import { Children, isValidElement, type ReactNode } from "react";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import Home from "../src/app/page";
import { POST as demoUnlockPost } from "../src/app/api/demo-unlock/route";
import { Report } from "../src/components/Report";
import { demoReport } from "../src/fixtures/report";
import { DEMO_REPORT_SESSION_ID } from "../src/lib/demo-access";
import {
  beginOneTimeCheckout,
  confirmOneTimeCheckout,
  DeterministicPaymentGateway,
  InMemoryReportOwnershipStore,
  lockedReportSession,
  REPORT_UNLOCK_AMOUNT_CENTS,
  REPORT_UNLOCK_CURRENCY,
} from "../src/lib/report-access";

function setup(state: "succeeded" | "cancelled" | "failed" | "unknown" = "succeeded") {
  return {
    store: new InMemoryReportOwnershipStore([lockedReportSession("report-1", demoReport)]),
    gateway: new DeterministicPaymentGateway(state),
  };
}

function findReportProps(node: ReactNode): { reportSessionId: string; unlocked?: boolean } | null {
  if (!isValidElement(node)) return null;
  if (node.type === Report) {
    return node.props as { reportSessionId: string; unlocked?: boolean };
  }

  const props = node.props as { children?: ReactNode };
  for (const child of Children.toArray(props.children)) {
    const found = findReportProps(child);
    if (found) return found;
  }
  return null;
}

describe("CP6 durable report ownership and payment boundaries", () => {
  it("defines exactly one provider-neutral CA$14.99 one-time checkout", async () => {
    const { store, gateway } = setup();
    const checkout = await beginOneTimeCheckout(store, gateway, "report-1");

    expect(REPORT_UNLOCK_AMOUNT_CENTS).toBe(1499);
    expect(REPORT_UNLOCK_CURRENCY).toBe("CAD");
    expect(checkout?.state).toBe("succeeded");
  });

  it("keeps report access locked until persisted server-side payment state succeeds", async () => {
    const { store, gateway } = setup("failed");
    const checkout = await beginOneTimeCheckout(store, gateway, "report-1");
    const after = await confirmOneTimeCheckout(store, gateway, "report-1", checkout!.checkoutId);

    expect(after?.access).toBe("locked");
    expect(after?.paymentState).toBe("failed");
  });

  it.each(["cancelled", "failed", "unknown"] as const)("keeps %s payments recoverably locked", async (state) => {
    const { store, gateway } = setup(state);
    const checkout = await beginOneTimeCheckout(store, gateway, "report-1");
    const after = await confirmOneTimeCheckout(store, gateway, "report-1", checkout!.checkoutId);

    expect(after?.access).toBe("locked");
    expect(after?.paymentState).toBe(state);
    expect(after?.report).toEqual(demoReport);
  });

  it("treats missing sessions and unknown checkout ids as locked rather than manufacturing entitlement", async () => {
    const { store, gateway } = setup();

    expect(await beginOneTimeCheckout(store, gateway, "missing")).toBeNull();
    expect(await confirmOneTimeCheckout(store, gateway, "missing", "anything")).toBeNull();

    const afterUnknown = await confirmOneTimeCheckout(store, gateway, "report-1", "unknown-checkout");
    expect(afterUnknown?.access).toBe("locked");
    expect(afterUnknown?.paymentState).toBe("unknown");
  });

  it("keeps an unknown viewed session bound to that same unknown identity in presentation", async () => {
    const page = await Home({ searchParams: Promise.resolve({ session: "missing-report" }) });
    const reportProps = findReportProps(page);

    expect(reportProps).not.toBeNull();
    expect(reportProps?.reportSessionId).toBe("missing-report");
    expect(reportProps?.reportSessionId).not.toBe(DEMO_REPORT_SESSION_ID);
    expect(reportProps?.unlocked).toBe(false);
  });

  it("refuses an unknown posted session without unlocking or redirecting into the demo report", async () => {
    const request = new NextRequest("http://localhost/api/demo-unlock", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ reportSessionId: "missing-report" }).toString(),
    });

    const response = await demoUnlockPost(request);
    const location = response.headers.get("location") ?? "";

    expect(response.status).toBe(303);
    expect(location).toContain("access=unknown-session");
    expect(location).not.toContain(`session=${DEMO_REPORT_SESSION_ID}`);
    expect(location).not.toContain("access=unlocked");
  });

  it("unlocks idempotently and preserves the exact already-produced report", async () => {
    const { store, gateway } = setup();
    const before = await store.get("report-1");
    const checkout = await beginOneTimeCheckout(store, gateway, "report-1");
    const first = await confirmOneTimeCheckout(store, gateway, "report-1", checkout!.checkoutId, "2026-09-11T00:00:00.000Z");
    const second = await confirmOneTimeCheckout(store, gateway, "report-1", checkout!.checkoutId, "2026-09-12T00:00:00.000Z");
    const repeatedBegin = await beginOneTimeCheckout(store, gateway, "report-1");

    expect(first?.access).toBe("unlocked");
    expect(first?.report).toEqual(before?.report);
    expect(second).toEqual(first);
    expect(repeatedBegin?.checkoutId).toBe(checkout?.checkoutId);
    expect(second?.unlockedAt).toBe("2026-09-11T00:00:00.000Z");
  });
});
