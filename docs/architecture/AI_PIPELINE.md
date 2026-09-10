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
