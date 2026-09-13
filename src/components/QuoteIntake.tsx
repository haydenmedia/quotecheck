"use client";

import { useRef, useState } from "react";
import { launchCategories } from "@/lib/launch-readiness";
import {
  ACCEPTED_QUOTE_FILE_TYPES,
  QUOTE_SLOT_IDS,
  canAnalyzeRealQuotes,
  createFileSelection,
  createTextSelection,
  removeQuoteSelection,
  setQuoteSelection,
  type QuoteSelections,
  type QuoteSlotId,
} from "@/lib/quote-intake";
import styles from "./QuoteIntake.module.css";

const ACCEPT_ATTRIBUTE = [...ACCEPTED_QUOTE_FILE_TYPES, ".jpg", ".jpeg"].join(",");

type SlotDrafts = Partial<Record<QuoteSlotId, string>>;
type SlotErrors = Partial<Record<QuoteSlotId, string>>;

export function QuoteIntake() {
  const [selections, setSelections] = useState<QuoteSelections>({});
  const [drafts, setDrafts] = useState<SlotDrafts>({});
  const [errors, setErrors] = useState<SlotErrors>({});
  const [status, setStatus] = useState<string>("");
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

  function analyze() {
    if (!canAnalyzeRealQuotes(selections)) return;
    setStatus("Your real quote selections are ready. Analysis wiring is not available in this slice yet, so QuoteCheck will not substitute sample or fixture results.");
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
                    onChange={(event) => chooseFile(slotId, event.currentTarget.files?.[0])}
                  />
                </label>
              </div>

              <label htmlFor={`quote-text-${slotId}`}>Or paste quote text</label>
              <textarea
                className={styles.textArea}
                id={`quote-text-${slotId}`}
                value={drafts[slotId] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [slotId]: event.target.value }))}
                placeholder="Paste the quote exactly as provided"
              />
              <div className={styles.textActions}>
                <button className={styles.button} type="button" onClick={() => savePastedText(slotId)}>
                  {selection?.kind === "pasted_text" ? "Replace with pasted text" : "Use pasted text"}
                </button>
                {selection ? <button className={styles.button} type="button" onClick={() => remove(slotId)}>Remove</button> : null}
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

      <fieldset>
        <legend>What kind of quotes are these?</legend>
        <div className="category-grid">
          {launchCategories.map((category, index) => (
            <label key={category}>
              <input defaultChecked={index === 2} name="category" type="radio" />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button className={styles.analyze} type="button" disabled={!canAnalyzeRealQuotes(selections)} onClick={analyze}>
        Analyze my quotes
      </button>
      <p className={styles.note}>Analysis remains intentionally blocked until the next CP13 slice connects these exact selections to extraction and reasoning. The example report elsewhere on this page is static and is not generated from your selections.</p>
      {status ? <p className={styles.status} role="status">{status}</p> : null}
    </section>
  );
}
