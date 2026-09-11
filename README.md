# QuoteCheck

QuoteCheck is a mobile-first second-opinion tool for comparing 2–3 quotes before a user commits to an expensive purchase or project.

## Current checkpoint

CP1 uses deterministic fixture data to demonstrate the frozen golden journey:

2–3 quote inputs → structured comparison → useful free preview → one-time **CA$14.99** unlock → complete grounded report.

The scaffold intentionally does **not** call live AI/OCR providers, process payments, persist uploads, authenticate users, or write to production storage yet.

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

- `src/lib/types.ts` contains canonical UI-facing Quote/Finding/Report contracts plus provider interfaces.
- `src/fixtures/report.ts` provides deterministic comparison/report fixtures.
- `src/lib/trust.ts` centralizes finding taxonomy and the `not_stated` trust rule.
- Live extraction and reasoning providers will be injected later behind replaceable configuration rather than hard-coded into product logic.

See `docs/architecture/` and `docs/product/` for the canonical contracts and checkpoint acceptance criteria.
