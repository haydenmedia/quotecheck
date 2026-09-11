# Data Contracts

## Canonical Quote
A quote record contains: id; source input ids; vendor identity as stated; quote date/expiry; project description; line items; subtotal/tax/fees/total; allowances; explicitly included items; explicitly excluded items; warranty; timeline; payment terms; conditions; uncertainties; extraction warnings; source evidence.

Every scalar extracted value is represented as a `SourcedValue<T>` with `value`, `certainty` (`stated`, `ambiguous`, `unreadable`, `not_stated`) and source `evidence`. Unknown/unreadable values remain unknown; they are never guessed. Explicit exclusions remain separate from absent fields. Arithmetic checks preserve original source amounts and emit `ARITHMETIC_MISMATCH` warnings rather than silently correcting totals.

## Deterministic ingestion input
`TextIngestionInput` supports `pasted_text` and `extracted_text_fixture`. Future PDF/image/multimodal extraction must implement the provider-neutral `ExtractionProvider` contract and return the same canonical `ExtractionResult`.

## Reasoning request
`ReasoningRequest` contains canonical `quotes`, the selected `category`, and a versioned `ReasoningContext` domain pack (`id`, `version`, `category`, `label`, contextual considerations/questions/trust notes). Provider/model identity is intentionally absent from this product contract.

## Finding
`id`, `type`, `severity`, `title`, `plainLanguageExplanation`, `affectedQuoteIds`, `evidenceRefs`, `confidence`, `questionsToAsk`, with optional `scopeStatus` for report presentation when the underlying canonical state is specifically `included`, `excluded`, or `not_stated`.

Allowed finding types: `explicit_fact`, `difference`, `not_stated`, `potential_risk`, `inference`.

Any material finding that depends on a quoted fact must identify affected quote IDs and carry evidence refs resolving to the supplied source material. `not_stated` may legitimately have no evidence ref because it asserts absence from the supplied canonical data; it must not be converted into an exclusion or claimed charge. Potential risks and inferences remain qualified. `scopeStatus: excluded` is reserved for an explicit exclusion supported by source evidence and must never be inferred from omission; `scopeStatus: not_stated` represents genuine omission only.

## Report
Quote summaries; findings; sections; overall gut check; confidence/limitations; `noMaterialConcern`. Report rendering and future PDF export consume the same report object. Empty risk sections are valid when evidence does not justify a risk finding.

Every canonical field surfaced in quote comparison uses the reusable `ReportSummaryValue<T>` contract (an alias of `SourcedValue<T>`), preserving the canonical `value`, `certainty`, and source `evidence` through reasoning and presentation. This applies to vendor identity, total, warranty, timeline and payment terms; scope inclusions/exclusions are arrays of the same sourced value contract.

Presentation is certainty-aware: `stated` renders the grounded value; `not_stated` may render `Not stated`; `ambiguous` must communicate that source content exists but is ambiguous; `unreadable` must communicate that source content could not be reliably read. Evidence remains inspectable for stated/ambiguous/unreadable values when supplied. No ambiguous or unreadable field may be flattened into `Not stated`, and no absent value may be manufactured as zero or other false certainty.

An empty inclusion/exclusion array represents genuine omission and may render as `Not stated`. A stated exclusion remains an explicit exclusion; ambiguous/unreadable exclusion content remains uncertain and must never be upgraded into an explicit exclusion. Absence is never proof of an additional charge.
