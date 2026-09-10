# Prompt Registry

Prompt/model changes are versioned product changes and must be evaluated before promotion.

## Extraction objective
Convert supplied quote material into the canonical quote schema. Preserve uncertainty, unreadable content and source evidence. Do not infer missing commercial terms during extraction.

## Reasoning objective
Reconstruct the commercial structure a reasonably complete quotation for this specific job would normally address, compare that structure with what each supplied quote explicitly states, and identify meaningful differences, ambiguities, exclusions, unstated categories, conditional charges, scope gaps, assumptions, warranty/payment/timeline differences and other material considerations.

Every finding must be classified as `explicit_fact`, `difference`, `not_stated`, `potential_risk`, or `inference`. A potential risk must be phrased as something to clarify, not as a fact. The model must be allowed to return no material concerns.

Domain packs provide contextual vocabulary and common commercial structure; they must not become mandatory exhaustive checklists.
