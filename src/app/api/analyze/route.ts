import { NextResponse } from "next/server";
import { analyzeRealQuoteSelections } from "@/lib/real-analysis";
import {
  createFileSelection,
  createTextSelection,
  setQuoteSelection,
  type QuoteSelections,
  type QuoteSlotId,
} from "@/lib/quote-intake";
import type { QuoteCategory } from "@/lib/types";

export const runtime = "nodejs";

const CATEGORIES = new Set<QuoteCategory>(["general", "automotive", "renovation", "trades"]);
const SLOT_IDS: QuoteSlotId[] = [1, 2, 3];

function asCategory(value: FormDataEntryValue | null): QuoteCategory | null {
  return typeof value === "string" && CATEGORIES.has(value as QuoteCategory)
    ? value as QuoteCategory
    : null;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Quote inputs could not be read. Try again." } }, { status: 400 });
  }

  const category = asCategory(form.get("category"));
  if (!category) {
    return NextResponse.json({ ok: false, error: { message: "Choose a valid quote category." } }, { status: 400 });
  }

  let selections: QuoteSelections = {};

  for (const slotId of SLOT_IDS) {
    const kind = form.get(`slot-${slotId}-kind`);
    if (kind === null) continue;

    if (kind === "pasted_text") {
      const value = form.get(`slot-${slotId}-text`);
      const selection = typeof value === "string" ? createTextSelection(slotId, value) : null;
      if (!selection) {
        return NextResponse.json({ ok: false, error: { message: `Quote ${slotId} pasted text is empty.` } }, { status: 400 });
      }
      selections = setQuoteSelection(selections, selection);
      continue;
    }

    if (kind === "file") {
      const value = form.get(`slot-${slotId}-file`);
      if (!(value instanceof File)) {
        return NextResponse.json({ ok: false, error: { message: `Quote ${slotId} file could not be read.` } }, { status: 400 });
      }
      const selection = createFileSelection(slotId, value);
      if (!selection) {
        return NextResponse.json({ ok: false, error: { message: `Quote ${slotId} must be a PDF, PNG, JPG or JPEG file.` } }, { status: 400 });
      }
      selections = setQuoteSelection(selections, selection);
      continue;
    }

    return NextResponse.json({ ok: false, error: { message: `Quote ${slotId} has an unsupported input type.` } }, { status: 400 });
  }

  const result = await analyzeRealQuoteSelections(selections, category);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
