# QuoteCheck MVP data lifecycle

CP8-03 inventory. This file does not authorize new persistence or external integrations.

## Lifecycle

- Raw quote text enters ingestion and analysis in memory.
- Normalized/extracted text remains in memory and is used to validate grounding.
- Canonical quote data keeps certainty plus source evidence/locators through reasoning and report generation.
- Reasoning output becomes the report presentation model.
- Demo report ownership and unlock state live in the existing in-memory ownership store.
- Public URLs contain only bounded access state (`unlocked`, `locked`, or `unknown-session`) and an anchor.

Until a later checkpoint explicitly authorizes persistence architecture, quote bodies, normalized text, canonical evidence, reasoning output, report state and ownership state remain session-scoped/process-local. CP8-03 adds no browser storage, cookies, database writes, object storage, analytics payloads, or external logging.

## Exposure audit

Audited URLs/query strings, hidden form fields, browser-storage seams, cache/persistence seams, application logging, error rendering and the demo unlock redirect.

Confirmed exposure fixed: the demo unlock flow previously placed the report-session identifier in a hidden form field and redirect query string. The route now resolves the single demo session server-side. Public redirects expose only bounded access state, and arbitrary error/input text is never echoed into public error copy.

Quote bodies, evidence excerpts, stack traces, provider internals, checkout identifiers and report-session identifiers are not intentionally emitted through the public error/redirect boundary. Source evidence remains visible only inside the intended report experience.

## Preserved invariants

The internal ownership identifier still binds unlock state to the same completed report. Preview/full-report behavior, the one-time CA$14.99 contract, canonical uncertainty/source evidence, and CP7 trust semantics are unchanged.

Any later durable storage, identity system, retention policy, or telemetry involving quote/report content requires a separate checkpoint and risk review.
