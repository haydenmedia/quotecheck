import type { TextIngestionInput } from "@/lib/types";

export const ingestionFixtures: Record<string, TextIngestionInput> = {
  clean: {
    id: "clean-v1",
    label: "Clean quote v1",
    kind: "extracted_text_fixture",
    page: 1,
    text: `Vendor: Northline Plumbing\nQuote Date: 2026-09-10\nExpiry: 2026-10-10\nProject: Replace hot water tank\nItem: 50 gallon tank | qty=1 | unit=each | labour=450 | materials=1250 | price=1700\nSubtotal: 1700\nTax: 85\nFees: 0\nTotal: 1785\nIncluded: removal of old tank\nWarranty: 6 years parts, 1 year labour\nTimeline: one day\nPayment Terms: due on completion`,
  },
  missingFields: {
    id: "missing-v1",
    label: "Missing fields v1",
    kind: "pasted_text",
    text: `Vendor: QuickFix\nProject: Replace hot water tank\nSubtotal: 1500\nTax: 75\nTotal: 1575`,
  },
  ambiguous: {
    id: "ambiguous-v1",
    label: "Ambiguous wording v1",
    kind: "extracted_text_fixture",
    text: `Vendor: Westside Mechanical\nProject: Replace hot water tank\nWarranty: [ambiguous] standard manufacturer coverage\nTimeline: unclear\nSubtotal: 1600\nTax: 80\nFees: 0\nTotal: 1680`,
  },
  explicitExclusion: {
    id: "exclusion-v1",
    label: "Explicit exclusion v1",
    kind: "extracted_text_fixture",
    text: `Vendor: Blue Pine Services\nProject: Replace hot water tank\nSubtotal: 1450\nTax: 72.50\nFees: 0\nTotal: 1522.50\nExcluded: permit fees\nPayment Terms: 50% deposit, balance on completion`,
  },
  arithmeticMismatch: {
    id: "math-v1",
    label: "Arithmetic mismatch v1",
    kind: "extracted_text_fixture",
    text: `Vendor: Cedar Mechanical\nProject: Replace hot water tank\nSubtotal: 1000\nTax: 50\nFees: 25\nTotal: 1200`,
  },
  noConcern: {
    id: "no-concern-v1",
    label: "No concern v1",
    kind: "extracted_text_fixture",
    text: `Vendor: Summit Mechanical\nQuote Date: 2026-09-10\nExpiry: 2026-10-10\nProject: Replace hot water tank\nItem: tank and installation | qty=1 | unit=job | labour=500 | materials=1400 | price=1900\nSubtotal: 1900\nTax: 95\nFees: 0\nTotal: 1995\nIncluded: delivery\nIncluded: removal and disposal of old tank\nWarranty: 6 years parts, 2 years labour\nTimeline: one day\nPayment Terms: due on completion`,
  },
  unreadable: {
    id: "unreadable-v1",
    label: "Unreadable field v1",
    kind: "extracted_text_fixture",
    page: 2,
    text: `Vendor: [unreadable]\nProject: Replace hot water tank\nSubtotal: 1700\nTax: 85\nFees: 0\nTotal: 1785`,
  },
};
