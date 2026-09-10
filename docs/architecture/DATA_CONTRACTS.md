# Data Contracts

## Canonical Quote
A quote record contains: id; source documents; vendor identity as stated; quote date/expiry; project description; line items; subtotal/tax/fees/total; allowances; explicitly included items; explicitly excluded items; warranty; timeline; payment terms; conditions; uncertainties; source evidence.

Each material extracted value should support evidence references such as document/page/text span and extraction confidence. Unknown/unreadable values remain unknown; they are not guessed.

## Finding
`id`, `type`, `severity`, `title`, `plain_language_explanation`, `affected_quote_ids`, `evidence_refs`, `confidence`, `questions_to_ask`.

Allowed finding types: `explicit_fact`, `difference`, `not_stated`, `potential_risk`, `inference`.

## Report
Quote summaries; normalized comparison dimensions; findings; vendor-specific questions; overall gut check; confidence/limitations; prompt/model/version metadata. Report rendering and future PDF export must consume the same report object.
