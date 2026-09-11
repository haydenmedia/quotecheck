# Data Contracts

## Canonical Quote
A quote record contains: id; source input ids; vendor identity as stated; quote date/expiry; project description; line items; subtotal/tax/fees/total; allowances; explicitly included items; explicitly excluded items; warranty; timeline; payment terms; conditions; uncertainties; extraction warnings; source evidence.

Every scalar extracted value is represented as a `SourcedValue<T>` with `value`, `certainty` (`stated`, `ambiguous`, `unreadable`, `not_stated`) and source `evidence`. Unknown/unreadable values remain unknown; they are never guessed. Explicit exclusions remain separate from absent fields. Arithmetic checks preserve original source amounts and emit `ARITHMETIC_MISMATCH` warnings rather than silently correcting totals.

## Deterministic ingestion input
`TextIngestionInput` supports `pasted_text` and `extracted_text_fixture`. Future PDF/image/multimodal extraction must implement the provider-neutral `ExtractionProvider` contract and return the same canonical `ExtractionResult`.

## Reasoning request
`ReasoningRequest` contains canonical `quotes`, the selected `category`, and a versioned `ReasoningContext` domain pack (`id`, `version`, `category`, `label`, contextual considerations/questions/trust notes). Provider/model identity is intentionally absent from this product contract.

## Finding
`id`, `type`, `severity`, `title`, `plainLanguageExplanation`, `affectedQuoteIds`, `evidenceRefs`, `confidence`, `questionsToAsk`.

Allowed finding types: `explicit_fact`, `difference`, `not_stated`, `potential_risk`, `inference`.

Any material finding that depends on a quoted fact must identify affected quote IDs and carry evidence refs resolving to the supplied source material. `not_stated` may legitimately have no evidence ref because it asserts absence from the supplied canonical data; it must not be converted into an exclusion or claimed charge. Potential risks and inferences remain qualified.

## Report
Quote summaries; findings; sections; overall gut check; confidence/limitations; `noMaterialConcern`. Report rendering and future PDF export consume the same report object. Empty risk sections are valid when evidence does not justify a risk finding.
