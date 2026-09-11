import type { QuoteReport } from "./types";

export const REPORT_UNLOCK_AMOUNT_CENTS = 1499;
export const REPORT_UNLOCK_CURRENCY = "CAD" as const;

export type PaymentState = "pending" | "succeeded" | "cancelled" | "failed" | "unknown";
export type AccessState = "locked" | "unlocked";

export interface CheckoutRequest {
  reportSessionId: string;
  amountCents: typeof REPORT_UNLOCK_AMOUNT_CENTS;
  currency: typeof REPORT_UNLOCK_CURRENCY;
  mode: "one_time";
}

export interface CheckoutResult {
  checkoutId: string;
  reportSessionId: string;
  state: PaymentState;
}

export interface PaymentGateway {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  readPayment(checkoutId: string): Promise<CheckoutResult | null>;
}

export interface ReportOwnershipRecord {
  reportSessionId: string;
  report: QuoteReport;
  access: AccessState;
  checkoutId: string | null;
  paymentState: PaymentState;
  unlockedAt: string | null;
}

export interface ReportOwnershipStore {
  get(reportSessionId: string): Promise<ReportOwnershipRecord | null>;
  put(record: ReportOwnershipRecord): Promise<void>;
}

export class InMemoryReportOwnershipStore implements ReportOwnershipStore {
  private records = new Map<string, ReportOwnershipRecord>();

  constructor(seed: ReportOwnershipRecord[] = []) {
    for (const record of seed) this.records.set(record.reportSessionId, structuredClone(record));
  }

  async get(reportSessionId: string) {
    const record = this.records.get(reportSessionId);
    return record ? structuredClone(record) : null;
  }

  async put(record: ReportOwnershipRecord) {
    this.records.set(record.reportSessionId, structuredClone(record));
  }
}

export class DeterministicPaymentGateway implements PaymentGateway {
  private payments = new Map<string, CheckoutResult>();
  private sequence = 0;

  constructor(private defaultState: PaymentState = "succeeded") {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const checkoutId = `mock_checkout_${++this.sequence}`;
    const result = { checkoutId, reportSessionId: request.reportSessionId, state: this.defaultState };
    this.payments.set(checkoutId, result);
    return { ...result };
  }

  async readPayment(checkoutId: string) {
    const result = this.payments.get(checkoutId);
    return result ? { ...result } : null;
  }

  setState(checkoutId: string, state: PaymentState) {
    const current = this.payments.get(checkoutId);
    if (current) this.payments.set(checkoutId, { ...current, state });
  }
}

export function lockedReportSession(reportSessionId: string, report: QuoteReport): ReportOwnershipRecord {
  return { reportSessionId, report, access: "locked", checkoutId: null, paymentState: "pending", unlockedAt: null };
}

export async function beginOneTimeCheckout(
  store: ReportOwnershipStore,
  gateway: PaymentGateway,
  reportSessionId: string,
): Promise<CheckoutResult | null> {
  const record = await store.get(reportSessionId);
  if (!record) return null;
  if (record.access === "unlocked" && record.checkoutId) {
    return { checkoutId: record.checkoutId, reportSessionId, state: "succeeded" };
  }

  const checkout = await gateway.createCheckout({
    reportSessionId,
    amountCents: REPORT_UNLOCK_AMOUNT_CENTS,
    currency: REPORT_UNLOCK_CURRENCY,
    mode: "one_time",
  });
  await store.put({ ...record, checkoutId: checkout.checkoutId, paymentState: checkout.state });
  return checkout;
}

export async function confirmOneTimeCheckout(
  store: ReportOwnershipStore,
  gateway: PaymentGateway,
  reportSessionId: string,
  checkoutId: string,
  now = new Date().toISOString(),
): Promise<ReportOwnershipRecord | null> {
  const record = await store.get(reportSessionId);
  if (!record) return null;
  if (record.access === "unlocked") return record;

  const payment = await gateway.readPayment(checkoutId);
  if (!payment || payment.reportSessionId !== reportSessionId) {
    const locked = { ...record, paymentState: "unknown" as const };
    await store.put(locked);
    return locked;
  }

  if (payment.state !== "succeeded") {
    const locked = { ...record, checkoutId, paymentState: payment.state, access: "locked" as const };
    await store.put(locked);
    return locked;
  }

  const unlocked = {
    ...record,
    checkoutId,
    paymentState: "succeeded" as const,
    access: "unlocked" as const,
    unlockedAt: record.unlockedAt ?? now,
  };
  await store.put(unlocked);
  return unlocked;
}
