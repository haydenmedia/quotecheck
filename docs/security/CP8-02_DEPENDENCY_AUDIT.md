# CP8-02 dependency audit evidence

## Baseline

Known-good application SHA: `798b3912feff7e5affe843cb467cbfda76e71172`.
Baseline CI evidence run: `34693605705` (Node 22.23.2 / npm 10.9.8).

A clean `npm install` / `npm audit --json` reproduced 5 vulnerable packages: 2 critical, 2 high, 1 moderate.

Direct findings:
- `next@15.2.4` — aggregate severity critical. The audit included, among others, RSC RCE `GHSA-9qr9-h5gf-34mp`, multiple Server Component / middleware / SSRF DoS high advisories, and 2026 critical advisories `GHSA-p293-qw3h-jr36` and `GHSA-2xp9-vwfh-vxw4`. npm reported `next@15.5.25` as the first non-major remediation candidate for the direct Next findings.
- `vitest@3.0.8` — aggregate severity critical through `GHSA-5xrq-8626-4rwp` plus transitive `@vitest/mocker` advisory `GHSA-82fw-gwwq-j7x9`.

Transitive findings:
- `postcss<=8.5.22` — aggregate severity high under Next, including arbitrary file read/path traversal (`GHSA-6g55-p6wh-862q`, `GHSA-r28c-9q8g-f849`) plus related moderate advisories.
- `sharp<0.35.4` — high under Next through inherited image-library vulnerabilities (`GHSA-f88m-g3jw-g9cj`, `GHSA-rgj7-g3m4-5g8c`).
- `@vitest/mocker<4.1.11` — moderate path traversal/arbitrary file read (`GHSA-82fw-gwwq-j7x9`).

## Remediation decision

`next@15.5.25` removed the direct Next and Sharp critical/high findings but still resolved vulnerable PostCSS. npm then recommended Next 16.3.5 to eliminate that remaining high path. Attempts to pin patched PostCSS through npm overrides failed in npm 10.9.8 before resolution with an internal Arborist `edgesOut` error, both globally and when scoped under Next. To satisfy the no-critical/high criterion without an unsupported lockfile override, Next was upgraded to `16.3.5`; React/React DOM remain `19.0.0` and application tests/build remain the compatibility gate.

Vitest is upgraded only to `3.2.7`. This removes its baseline critical UI-server advisory but leaves `GHSA-82fw-gwwq-j7x9` as moderate in the test-only `@vitest/mocker` path. QuoteCheck does not run the Vitest UI/mocker server in production; CI invokes `vitest run` against repository-owned deterministic fixtures. npm currently requires a further breaking Vitest major to clear this moderate advisory. The residual is therefore documented rather than forcing unrelated test-runner churn.

## Required final verification

The final locked PR head must demonstrate: reproducible install with `npm ci`; `npm audit --audit-level=high` success (zero critical/high findings); lint and typecheck success; all deterministic tests; CP7 trust fixture 32/32 agreement; and a successful production build. No paid/live model evaluation, deployment, or other YELLOW/RED action is part of CP8-02.
