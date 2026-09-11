# Data Contracts

## Canonical Quote
A quote record contains: id; source input ids; vendor identity as stated; quote date/expiry; project description; line items; subtotal/tax/fees/total; allowances; explicitly included items; explicitly excluded items; warranty; timeline; payment terms; conditions; uncertainties; extraction warnings; source evidence.

Every scalar extracted value is represented as a `SourcedValue<T>` with:

- `value`: the extracted source value or `null` when unknown/unreadable;
- `certainty`: `stated`, `ambiguous`, `unreadable`, or `not_stated`;
- `evidence`: one or more references to the source input, excerpt, confidence, and locator when available.

Evidence locators support page, line, and future character spans. Unknown/unreadable values remain unknown; they are never guessed.

### Trust distinctions

- `not_stated` means the source did not state the field. It is not an exclusion.
- `unreadable` means source content exists but cannot be reliably read. It is not absence.
- `ambiguous` preserves uncertainty rather than upgrading wording to certainty.
- explicit exclusions are stored separately from absent fields.
- arithmetic checks preserve original source amounts and emit `ARITHMETIC_MISMATCH` warnings rather than silently correcting totals.

## Deterministic ingestion input

`TextIngestionInput` supports `pasted_text` and `extracted_text_fixture`. The deterministic parser recognizes labelled text and the fixture line-item form only. It is not OCR and is not intended to infer arbitrary prose. Future PDF/image/multimodal extraction must implement the provider-neutral `ExtractionProvider` contract and return the same canonical `ExtractionResult`.

## Finding
`id`, `type`, `severity`, `title`, `plain_language_explanation`, `affected_quote_ids`, `evidence_refs`, `confidence`, `questions_to_ask`.

Allowed finding types: `explicit_fact`, `difference`, `not_stated`, `potential_risk`, `inference`.

## Report
Quote summaries; normalized comparison dimensions; findings; vendor-specific questions; overall gut check; confidence/limitations; prompt/model/version metadata. Report rendering and future PDF export must consume the same report object.
