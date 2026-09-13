import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoReport } from "../src/fixtures/report";
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

  it("keeps generated report identity server-scoped instead of exposing it through page query state or report markup", () => {
    const pageSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
    const reportSource = readFileSync(new URL("../src/components/Report.tsx", import.meta.url), "utf8");

    expect(pageSource).toContain("cookieStore.get(GENERATED_REPORT_SESSION_COOKIE)?.value");
    expect(pageSource).toContain("getGeneratedReport(reportSessionId)");
    expect(pageSource).not.toContain("params.reportSessionId");
    expect(pageSource).not.toContain("params.session");
    expect(reportSource).not.toContain('name="reportSessionId"');
    expect(reportSource).not.toContain("reportSessionId:");
  });

  it("keeps the legacy static demo checkout server-scoped for the education example", () => {
    const routeSource = readFileSync(new URL("../src/app/api/demo-unlock/route.ts", import.meta.url), "utf8");
    expect(routeSource).toContain("DEMO_REPORT_SESSION_ID");
    expect(routeSource).toContain("beginOneTimeCheckout(");
    expect(routeSource).not.toContain("request.formData()");
    expect(routeSource).not.toContain('form.get("reportSessionId")');
    expect(routeSource).not.toContain('searchParams.set("session"');
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
