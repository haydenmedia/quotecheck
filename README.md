# QuoteCheck

QuoteCheck is a mobile-first second-opinion tool for comparing 2–3 quotes before a user commits to an expensive purchase or project.

## Current checkpoint

CP2 builds the ingestion boundary underneath the CP1 golden journey:

2–3 quote inputs → canonical extraction → structured comparison → useful free preview → one-time **CA$14.99** unlock → complete grounded report.

The current implementation includes deterministic parsing for pasted text and versioned extracted-text fixtures. It intentionally does **not** perform OCR or call live AI/model providers. Payments, persistence, authentication, production storage, full reasoning/domain packs and PDF export remain out of scope.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture seams

- `src/lib/types.ts` contains canonical ingestion, Quote/Finding/Report contracts and provider-neutral interfaces.
- `src/lib/ingestion.ts` contains deterministic labelled-text normalization, uncertainty preservation, evidence capture and arithmetic consistency checks.
- `src/fixtures/ingestion.ts` contains versioned fixtures for clean, missing, ambiguous, excluded, arithmetic-mismatch, unreadable and no-concern cases.
- `src/fixtures/report.ts` provides deterministic comparison/report fixtures.
- `src/lib/trust.ts` centralizes finding taxonomy and the `not_stated` trust rule.
- Future PDF/image/multimodal extractors must implement `ExtractionProvider` and return the canonical `ExtractionResult`; provider/model identity stays outside product logic.

### Ingestion trust invariants

- Absence is not exclusion.
- Unreadable is not absent.
- Ambiguity is not certainty.
- Arithmetic mismatch produces a warning; source values are never silently rewritten.
- Vendor, scope, pricing, warranty and timing values are never fabricated.

See `docs/architecture/` and `docs/product/` for the canonical contracts and checkpoint acceptance criteria.
