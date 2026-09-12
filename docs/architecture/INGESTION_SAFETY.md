# Ingestion Safety Boundary

CP8-01 hardens the existing deterministic text-ingestion seam. It does not add a parallel upload system or change provider/payment/storage behaviour.

## Accepted inputs

The current application contract accepts exactly **2 or 3** quote inputs. The only currently supported forms are the existing `TextIngestionInput` kinds:

- `pasted_text`
- `extracted_text_fixture` (deterministic fixture/mock use)

PDF/image/email extraction remains future provider work; raw MIME labels or arbitrary file types are not accepted by this boundary until they are normalized into the provider-neutral text contract.

## Deterministic limits

`ANALYSIS_INPUT_LIMITS` is the single code source of truth:

- 2–3 quotes per comparison.
- Maximum 100,000 text characters per quote.
- Maximum 250,000 text characters across the comparison.
- `id`, `label`, and non-blank `text` are required.
- Quote IDs must be unique within a comparison.

These bounds are intentionally conservative for the current mobile-first MVP and deterministic parser. They prevent unbounded user-controlled payloads while leaving ample room for ordinary commercial quotes. Future binary upload limits belong at the binary ingestion boundary and must not silently weaken these normalized-text limits.

## Failure contract

Validation happens before extraction/reasoning. Invalid count, unsupported kind, oversized content, malformed shape, blank content, or duplicate IDs return a recoverable user-safe error and invoke no analysis.

Extraction or reasoning exceptions are contained. User output never includes raw stack traces, provider/model identity, secret-like diagnostic text, or a fabricated/stale report. A failure result carries the same caller-supplied `reportSessionId` and no report payload, so this boundary cannot unlock, replace, or substitute report ownership/payment state.

Canonical extraction behaviour is unchanged: ambiguity/unreadability/source evidence continue through the existing `ExtractionProvider` contract and are not upgraded to certainty by the safety boundary.
