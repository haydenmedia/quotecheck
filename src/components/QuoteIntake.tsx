"use client";

import { useRef, useState } from "react";
import { launchCategories } from "@/lib/launch-readiness";
import {
  ACCEPTED_QUOTE_FILE_TYPES,
  QUOTE_SLOT_IDS,
  canAnalyzeRealQuotes,
  createFileSelection,
  createTextSelection,
  orderedQuoteSelections,
  removeQuoteSelection,
  setQuoteSelection,
  type QuoteSelections,
  type QuoteSlotId,
} from "@/lib/quote-intake";
import type { QuoteCategory } from "@/lib/types";
import styles from "./QuoteIntake.module.css";

const ACCEPT_ATTRIBUTE = [...ACCEPTED_QUOTE_FILE_TYPES, ".jpg", ".jpeg"].join(",");
const CATEGORY_VALUES: QuoteCategory[] = ["general", "automotive", "renovation", "trades"];

type SlotDrafts = Partial<Record<QuoteSlotId, string>>;
type SlotErrors = Partial<Record<QuoteSlotId, string>>;

type AnalysisResponse =
  | { ok: true; reportSessionId: string }
  | { ok: false; error?: { message?: string; slotId?: QuoteSlotId } };

export function QuoteIntake() {
  const [selections, setSelections] = useState<QuoteSelections>({});
  const [drafts, setDrafts] = useState<SlotDrafts>({});
  const [errors, setErrors] = useState<SlotErrors>({});
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<QuoteCategory>("renovation");
  const [pending, setPending] = useState(false);
  const fileRefs = useRef<Partial<Record<QuoteSlotId, HTMLInputElement | null>>>({});

  function clearSlotMessage(slotId: QuoteSlotId) {
    setErrors((current) => ({ ...current, [slotId]: undefined }));
    setStatus("");
  }

  function chooseFile(slotId: QuoteSlotId, file: File | undefined) {
    if (!file) return;
    clearSlotMessage(slotId);
    const selection = createFileSelection(slotId, file);
    if (!selection) {
      setErrors((current) => ({ ...current, [slotId]: "Choose a PDF, PNG, JPG or JPEG file." }));
      return;
    }
    setSelections((current) => setQuoteSelection(current, selection));
    setDrafts((current) => ({ ...current, [slotId]: "" }));
  }

  function savePastedText(slotId: QuoteSlotId) {
    clearSlotMessage(slotId);
    const text = drafts[slotId] ?? "";
    const selection = createTextSelection(slotId, text);
    if (!selection) {
      setErrors((current) => ({ ...current, [slotId]: "Paste meaningful quote text before saving." }));
      return;
    }
    setSelections((current) => setQuoteSelection(current, selection));
  }

  function remove(slotId: QuoteSlotId) {
    setSelections((current) => removeQuoteSelection(current, slotId));
    setDrafts((current) => ({ ...current, [slotId]: "" }));
    setErrors((current) => ({ ...current, [slotId]: undefined }));
    setStatus("");
    const input = fileRefs.current[slotId];
    if (input) input.value = "";
  }

  async function analyze() {
    if (!canAnalyzeRealQuotes(selections) || pending) return;

    setPending(true);
    setStatus("Analyzing your selected quotes…");
    setErrors({});

    try {
      const form = new FormData();
      form.set("category", category);

      for (const selection of orderedQuoteSelections(selections)) {
        form.set(`slot-${selection.slotId}-kind`, selection.kind);
        if (selection.kind === "pasted_text") {
          form.set(`slot-${selection.slotId}-text`, selection.text);
        } else {
          form.set(`slot-${selection.slotId}-file`, selection.file as File, selection.name);
        }
      }

      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const result = await response.json() as AnalysisResponse;

      if (!response.ok || !result.ok) {
        const message = result.ok ? "QuoteCheck could not finish this comparison." : result.error?.message ?? "QuoteCheck could not finish this comparison.";
        if (!result.ok && result.error?.slotId) {
          setErrors((current) => ({ ...current, [result.error!.slotId!]: message }));
        }
        setStatus(message);
        return;
      }

      setStatus(`Analysis completed from your selected quotes. Report session ${result.reportSessionId} is ready for the report-view binding step.`);
    } catch {
      setStatus("QuoteCheck could not reach the analysis service. Your selections are unchanged; try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section} id="compare" aria-labelledby="compare-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Start here</p>
          <h2 id="compare-title">Add 2–3 real quotes</h2>
        </div>
        <p>Choose a PDF, screenshot/photo, or paste quote text. Quotes 1 and 2 are required; Quote 3 is optional.</p>
      </div>

      <div className={styles.grid} aria-label="Quote inputs">
        {QUOTE_SLOT_IDS.map((slotId) => {
          const selection = selections[slotId];
          const required = slotId < 3;
          return (
            <article className={styles.slot} key={slotId}>
              <h3>Quote {slotId}</h3>
              <p>{required ? "Required for comparison" : "Optional third quote"}</p>

              <div className={styles.actions}>
                <label className={styles.fileLabel}>
                  {selection?.kind === "file" ? "Replace file" : "Choose file"}
                  <input
                    ref={(node) => { fileRefs.current[slotId] = node; }}
                    aria-label={`Choose file for Quote ${slotId}`}
                    type="file"
                    accept={ACCEPT_ATTRIBUTE}
                    disabled={pending}
                    onChange={(event) => chooseFile(slotId, event.currentTarget.files?.[0])}
                  />
                </label>
              </div>

              <label htmlFor={`quote-text-${slotId}`}>Or paste quote text</label>
              <textarea
                className={styles.textArea}
                id={`quote-text-${slotId}`}
                value={drafts[slotId] ?? ""}
                disabled={pending}
                onChange={(event) => setDrafts((current) => ({ ...current, [slotId]: event.target.value }))}
                placeholder="Paste the quote exactly as provided"
              />
              <div className={styles.textActions}>
                <button className={styles.button} type="button" disabled={pending} onClick={() => savePastedText(slotId)}>
                  {selection?.kind === "pasted_text" ? "Replace with pasted text" : "Use pasted text"}
                </button>
                {selection ? <button className={styles.button} type="button" disabled={pending} onClick={() => remove(slotId)}>Remove</button> : null}
              </div>

              {selection ? (
                <div className={styles.selected} role="status">
                  <strong>Selected</strong>
                  {selection.kind === "file"
                    ? <span>{selection.name} · {selection.mimeType || "file"}</span>
                    : <span>Pasted text · {selection.text.length} characters</span>}
                </div>
              ) : null}
              {errors[slotId] ? <p className={styles.error} role="alert">{errors[slotId]}</p> : null}
            </article>
          );
        })}
      </div>

      <fieldset disabled={pending}>
        <legend>What kind of quotes are these?</legend>
        <div className="category-grid">
          {launchCategories.map((label, index) => {
            const value = CATEGORY_VALUES[index];
            return (
              <label key={label}>
                <input
                  checked={category === value}
                  name="category"
                  type="radio"
                  value={value}
                  onChange={() => setCategory(value)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button className={styles.analyze} type="button" disabled={!canAnalyzeRealQuotes(selections) || pending} onClick={analyze}>
        {pending ? "Analyzing…" : "Analyze my quotes"}
      </button>
      <p className={styles.note}>Your selected sources are sent through QuoteCheck&apos;s extraction, evidence-validation and grounded reasoning path. The static example elsewhere on this page remains separate from your analysis.</p>
      {status ? <p className={styles.status} role="status" aria-live="polite">{status}</p> : null}
    </section>
  );
}
