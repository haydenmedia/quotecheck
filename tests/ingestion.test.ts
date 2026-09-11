import { describe, expect, it } from "vitest";
import { ingestionFixtures } from "../src/fixtures/ingestion";
import { ingestTextQuote } from "../src/lib/ingestion";

describe("canonical deterministic ingestion", () => {
  it("normalizes a clean quote without inventing warnings", () => {
    const { quote } = ingestTextQuote(ingestionFixtures.clean);
    expect(quote.vendor.value).toBe("Northline Plumbing");
    expect(quote.money.total.value).toBe(1785);
    expect(quote.lineItems[0].price.value).toBe(1700);
    expect(quote.warnings).toEqual([]);
  });

  it("preserves missing fields as not_stated instead of fabricating values", () => {
    const { quote } = ingestTextQuote(ingestionFixtures.missingFields);
    expect(quote.warranty).toEqual({ value: null, certainty: "not_stated", evidence: [] });
    expect(quote.timeline.value).toBeNull();
    expect(quote.paymentTerms.value).toBeNull();
  });

  it("preserves ambiguity and unreadable values as uncertainty", () => {
    const ambiguous = ingestTextQuote(ingestionFixtures.ambiguous).quote;
    expect(ambiguous.warranty.certainty).toBe("ambiguous");
    expect(ambiguous.timeline.certainty).toBe("ambiguous");
    expect(ambiguous.warnings.map((warning) => warning.code)).toContain("AMBIGUOUS_FIELD");

    const unreadable = ingestTextQuote(ingestionFixtures.unreadable).quote;
    expect(unreadable.vendor.certainty).toBe("unreadable");
    expect(unreadable.vendor.value).toBeNull();
    expect(unreadable.vendor.evidence[0].locator).toEqual({ page: 2, line: 1 });
  });

  it("preserves source evidence at field and line-item granularity", () => {
    const { quote } = ingestTextQuote(ingestionFixtures.clean);
    expect(quote.vendor.evidence[0]).toMatchObject({
      sourceInputId: "clean-v1",
      sourceLabel: "Clean quote v1",
      excerpt: "Vendor: Northline Plumbing",
      locator: { page: 1, line: 1 },
    });
    expect(quote.lineItems[0].price.evidence[0].locator?.line).toBe(5);
  });

  it("distinguishes an explicit exclusion from an unstated field", () => {
    const { quote } = ingestTextQuote(ingestionFixtures.explicitExclusion);
    expect(quote.exclusions).toHaveLength(1);
    expect(quote.exclusions[0].value).toBe("permit fees");
    expect(quote.exclusions[0].certainty).toBe("stated");
    expect(quote.warranty.certainty).toBe("not_stated");
  });

  it("reports arithmetic mismatch without rewriting source values", () => {
    const { quote } = ingestTextQuote(ingestionFixtures.arithmeticMismatch);
    expect(quote.money.subtotal.value).toBe(1000);
    expect(quote.money.tax.value).toBe(50);
    expect(quote.money.fees.value).toBe(25);
    expect(quote.money.total.value).toBe(1200);
    expect(quote.warnings).toHaveLength(1);
    expect(quote.warnings[0].code).toBe("ARITHMETIC_MISMATCH");
    expect(quote.warnings[0].message).toContain("1075.00");
  });

  it("supports a complete quote with no material extraction concern", () => {
    const { quote } = ingestTextQuote(ingestionFixtures.noConcern);
    expect(quote.warnings).toEqual([]);
    expect(quote.exclusions).toEqual([]);
    expect(quote.vendor.certainty).toBe("stated");
    expect(quote.money.total.certainty).toBe("stated");
  });
});
