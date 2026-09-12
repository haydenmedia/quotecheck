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

Inference findings carry provider-neutral structured `inferenceBasis` provenance when they depend on canonical uncertainty, conditions, or extraction warnings. Each basis identifies the canonical provenance kind, inferred subject/field, interpretation class, and exact evidence refs. Deterministic evaluation validates the structured proposition against the cited canonical node rather than attempting prose-semantic matching. A condition or uncertainty that exists somewhere in the quote is therefore not a license for an unrelated qualitative inference such as vendor reliability.

Domain packs contain considerations, questions, and trust notes. They are context, not mandatory checklists and not permission to manufacture findings.
