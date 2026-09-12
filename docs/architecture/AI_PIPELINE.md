# AI Pipeline

```text
PDF / image / pasted text
        ↓
input normalization + deterministic text extraction where available
        ↓
EXTRACTION_MODEL (replaceable configuration)
        ↓
canonical Quote objects + uncertainty + evidence
        ↓
domain selection/context pack
        ↓
REASONING_MODEL (replaceable configuration)
        ↓
grounded findings + normalized comparison + questions
        ↓
canonical Report object
        ↓
free preview / complete report / future PDF
```

Extraction does not perform commercial risk reasoning. Reasoning does not silently rewrite extracted source facts. Model provider/name belongs in configuration and run metadata. CI uses deterministic fixtures/mocks; bounded live evaluations require YELLOW authorization.

## CP3 reasoning boundary
`ReasoningProvider.analyze()` accepts canonical Quote objects, the selected QuoteCategory, and a versioned domain context pack. The deterministic provider used by CI applies the same trust contract expected of future live providers: facts/differences depending on quoted content carry source evidence; explicit exclusions remain distinct from omissions; ambiguity/unreadable material is not upgraded to certainty; absence never proves an extra charge; risk/inference language is qualified; and an analysis may validly return `noMaterialConcern=true`.

## CP7 structural inference boundary
Inference semantics are no longer authorized by free-form prose plus independently selected subject metadata. A closed provider-neutral `InferenceProposition` is the canonical assertion. Each proposition variant fixes its semantic subject/interpretation by construction and carries exact provenance.

Provenance used by a proposition must resolve to a canonical node already typed for that same subject. In particular, timeline/scheduling condition evidence is represented as a typed timeline condition and cannot be reused as vendor, payment, fees, total, scope, or other provenance. The global cross-subject condition allow-list is not part of the structural contract.

User-facing inference title/explanation is rendered deterministically from the proposition. The verifier mechanically requires exact renderer output, so free-form prose cannot drift into a second unsupported assertion. The existing `inferenceBasis` shape remains compatibility-only for earlier CP7 fixture/baseline checks; structural verification requires `inferenceProposition`.

Domain packs contain considerations, questions, and trust notes. They are context, not mandatory checklists and not permission to manufacture findings.
