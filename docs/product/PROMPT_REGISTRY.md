# Prompt Registry

Prompt/model changes are versioned product changes and must be evaluated before promotion.

## Extraction objective
Convert supplied quote material into the canonical quote schema. Preserve uncertainty, unreadable content and source evidence. Do not infer missing commercial terms during extraction.

## Reasoning objective
Reconstruct the commercial structure a reasonably complete quotation for this specific job would normally address, compare that structure with what each supplied quote explicitly states, and identify meaningful differences, ambiguities, exclusions, unstated categories, conditional charges, scope gaps, assumptions, warranty/payment/timeline differences and other material considerations.

Every finding must be classified as `explicit_fact`, `difference`, `not_stated`, `potential_risk`, or `inference`. A potential risk must be phrased as something to clarify, not as a fact. The model must be allowed to return no material concerns.

Domain packs provide contextual vocabulary and common commercial structure; they must not become mandatory exhaustive checklists.

## Grounding contract v1
Future reasoning providers receive the same `ReasoningRequest` used by the deterministic CI provider. Facts and differences must be grounded to quote IDs and source evidence where they depend on quoted content. Explicit exclusions are not omissions. `not_stated` means only that the supplied quote data did not state the term. Ambiguous or unreadable material cannot be promoted to certainty. Domain context can suggest questions and considerations but cannot create charges, exclusions, or vendor claims. Arithmetic/source warnings propagate into the report instead of being silently repaired. Empty risk sections and `noMaterialConcern=true` are valid outputs.
