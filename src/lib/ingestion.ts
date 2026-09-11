import type {
  CanonicalQuote,
  Certainty,
  EvidenceRef,
  ExtractionProvider,
  ExtractionResult,
  ExtractionWarning,
  QuoteLineItem,
  SourcedValue,
  TextIngestionInput,
} from "./types";

const FIELD_LABELS = {
  vendor: ["vendor", "contractor", "company"],
  quoteDate: ["quote date", "date"],
  expiryDate: ["expiry", "expires", "valid until"],
  projectDescription: ["project", "scope", "description"],
  subtotal: ["subtotal"],
  tax: ["tax", "gst", "hst"],
  fees: ["fees", "fee"],
  total: ["total"],
  warranty: ["warranty"],
  timeline: ["timeline", "schedule", "completion"],
  paymentTerms: ["payment terms", "payment"],
} as const;

type ScalarField = keyof typeof FIELD_LABELS;

function evidence(input: TextIngestionInput, quoteId: string, line: string, index: number): EvidenceRef {
  return {
    quoteId,
    sourceInputId: input.id,
    sourceLabel: input.label,
    excerpt: line.trim(),
    locator: { page: input.page, line: index + 1 },
    confidence: 1,
  };
}

function certaintyFor(raw: string): Certainty {
  const value = raw.toLowerCase();
  if (value.includes("[unreadable]") || value === "unreadable") return "unreadable";
  if (value.includes("[ambiguous]") || value.includes("unclear") || value === "tbd") return "ambiguous";
  return "stated";
}

function sourced<T>(value: T | null, certainty: Certainty, refs: EvidenceRef[] = []): SourcedValue<T> {
  return { value, certainty, evidence: refs };
}

function unknown<T>(): SourcedValue<T> {
  return sourced<T>(null, "not_stated");
}

function cleanMarkedValue(raw: string): string {
  return raw.replace(/\[(?:ambiguous|unreadable)\]/gi, "").trim();
}

function parseMoney(raw: string): number | null {
  const cleaned = cleanMarkedValue(raw).replace(/[$,\s]/g, "");
  if (!cleaned || !/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseNumber(raw: string): number | null {
  const cleaned = cleanMarkedValue(raw).trim();
  if (!cleaned || !/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function scalarValue(
  field: ScalarField,
  lines: string[],
  input: TextIngestionInput,
  quoteId: string,
  parser: (raw: string) => string | number | null = (raw) => cleanMarkedValue(raw),
): SourcedValue<string | number> {
  const labels = FIELD_LABELS[field];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (!match) continue;
    const label = match[1].trim().toLowerCase();
    if (!labels.some((candidate) => label === candidate)) continue;
    const raw = match[2].trim();
    const certainty = certaintyFor(raw);
    const parsed = certainty === "unreadable" ? null : parser(raw);
    return sourced(parsed, certainty, [evidence(input, quoteId, line, index)]);
  }
  return unknown();
}

function listValues(prefixes: string[], lines: string[], input: TextIngestionInput, quoteId: string): SourcedValue<string>[] {
  const results: SourcedValue<string>[] = [];
  lines.forEach((line, index) => {
    const match = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (!match) return;
    const label = match[1].trim().toLowerCase();
    if (!prefixes.includes(label)) return;
    const raw = match[2].trim();
    const certainty = certaintyFor(raw);
    results.push(sourced(certainty === "unreadable" ? null : cleanMarkedValue(raw), certainty, [evidence(input, quoteId, line, index)]));
  });
  return results;
}

function parseLineItems(lines: string[], input: TextIngestionInput, quoteId: string): QuoteLineItem[] {
  const items: QuoteLineItem[] = [];
  lines.forEach((line, index) => {
    const match = line.match(/^\s*item:\s*(.*)$/i);
    if (!match) return;
    const segments = match[1].split("|").map((segment) => segment.trim()).filter(Boolean);
    const descriptionRaw = segments.shift() ?? "";
    const refs = [evidence(input, quoteId, line, index)];
    const map = new Map<string, string>();
    segments.forEach((segment) => {
      const [key, ...rest] = segment.split("=");
      if (key && rest.length) map.set(key.trim().toLowerCase(), rest.join("=").trim());
    });
    const field = <T>(raw: string | undefined, parser: (value: string) => T | null): SourcedValue<T> => {
      if (raw === undefined) return unknown<T>();
      const certainty = certaintyFor(raw);
      return sourced(certainty === "unreadable" ? null : parser(raw), certainty, refs);
    };
    items.push({
      id: `${quoteId}-item-${items.length + 1}`,
      description: field(descriptionRaw, (value) => cleanMarkedValue(value) || null),
      quantity: field(map.get("qty") ?? map.get("quantity"), parseNumber),
      unit: field(map.get("unit"), (value) => cleanMarkedValue(value) || null),
      labour: field(map.get("labour") ?? map.get("labor"), parseMoney),
      materials: field(map.get("materials"), parseMoney),
      price: field(map.get("price"), parseMoney),
    });
  });
  return items;
}

function asString(value: SourcedValue<string | number>): SourcedValue<string> {
  return { ...value, value: typeof value.value === "string" ? value.value : null };
}

function asMoney(value: SourcedValue<string | number>): SourcedValue<number> {
  return { ...value, value: typeof value.value === "number" ? value.value : null };
}

function arithmeticWarnings(quote: CanonicalQuote): ExtractionWarning[] {
  const { subtotal, tax, fees, total } = quote.money;
  if ([subtotal, tax, fees, total].some((field) => field.value === null || field.certainty !== "stated")) return [];
  const expected = (subtotal.value ?? 0) + (tax.value ?? 0) + (fees.value ?? 0);
  const actual = total.value ?? 0;
  if (Math.abs(expected - actual) <= 0.01) return [];
  return [{
    code: "ARITHMETIC_MISMATCH",
    message: `Source values do not add up: subtotal + tax + fees = ${expected.toFixed(2)}, while stated total = ${actual.toFixed(2)}. Source values were preserved unchanged.`,
    evidence: [...subtotal.evidence, ...tax.evidence, ...fees.evidence, ...total.evidence],
  }];
}

function uncertaintyWarnings(quote: CanonicalQuote): ExtractionWarning[] {
  const watched = [quote.vendor, quote.projectDescription, quote.warranty, quote.timeline, quote.paymentTerms];
  const warnings: ExtractionWarning[] = [];
  watched.forEach((field) => {
    if (field.certainty === "ambiguous") {
      warnings.push({ code: "AMBIGUOUS_FIELD", message: "A source field is explicitly ambiguous and was not upgraded to certainty.", evidence: field.evidence });
    }
    if (field.certainty === "unreadable") {
      warnings.push({ code: "UNREADABLE_FIELD", message: "A source field is unreadable and remains unknown.", evidence: field.evidence });
    }
  });
  return warnings;
}

export function ingestTextQuote(input: TextIngestionInput): ExtractionResult {
  const quoteId = `quote-${input.id}`;
  const lines = input.text.split(/\r?\n/);
  const stringField = (field: ScalarField) => asString(scalarValue(field, lines, input, quoteId));
  const moneyField = (field: ScalarField) => asMoney(scalarValue(field, lines, input, quoteId, parseMoney));

  const quote: CanonicalQuote = {
    id: quoteId,
    sourceInputIds: [input.id],
    vendor: stringField("vendor"),
    quoteDate: stringField("quoteDate"),
    expiryDate: stringField("expiryDate"),
    projectDescription: stringField("projectDescription"),
    lineItems: parseLineItems(lines, input, quoteId),
    money: {
      subtotal: moneyField("subtotal"),
      tax: moneyField("tax"),
      fees: moneyField("fees"),
      total: moneyField("total"),
    },
    allowances: listValues(["allowance"], lines, input, quoteId),
    inclusions: listValues(["included", "inclusion"], lines, input, quoteId),
    exclusions: listValues(["excluded", "exclusion"], lines, input, quoteId),
    warranty: stringField("warranty"),
    timeline: stringField("timeline"),
    paymentTerms: stringField("paymentTerms"),
    conditions: listValues(["condition"], lines, input, quoteId),
    uncertainties: listValues(["uncertain", "uncertainty"], lines, input, quoteId),
    warnings: [],
  };

  quote.warnings = [...uncertaintyWarnings(quote), ...arithmeticWarnings(quote)];
  return { quote, rawText: input.text, sourceInputId: input.id };
}

export class DeterministicTextExtractionProvider implements ExtractionProvider {
  async extract(input: TextIngestionInput): Promise<ExtractionResult> {
    return ingestTextQuote(input);
  }
}
