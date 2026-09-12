# Private Beta Instrumentation Contract

Version: 1

CP9-01 establishes a provider-neutral instrumentation seam for the existing QuoteCheck golden journey. The runtime provider is intentionally no-op. A deterministic in-memory recorder exists for tests and local verification only. This checkpoint adds no analytics SDK, network transport, cookie, browser storage, server persistence, production telemetry, or consent-policy change.

## Event contract

Allowed events are deliberately limited to:

- `comparison_started`
- `quote_input_accepted`
- `quote_input_rejected`
- `analysis_succeeded`
- `analysis_failed`
- `preview_viewed`
- `unlock_intent`
- `unlock_succeeded`
- `unlock_failed`
- `full_report_viewed`

Payloads may contain only bounded operational metadata defined in `src/lib/private-beta-instrumentation.ts`: contract version, category, quote count, input ordinal/kind, and bounded failure reason. The contract rejects unknown payload keys at runtime in the deterministic recorder.

Never include raw quote text, evidence excerpts, vendor/customer names, report bodies, payment details, provider/model identifiers, secrets, report-session identifiers, browser-visible session identifiers, or arbitrary error strings.

## Existing seams

`analyzeQuotesWithPrivateBetaInstrumentation` wraps the existing safe analysis boundary without changing extraction or reasoning behavior. It emits comparison/input/analysis events while delegating the actual result to `analyzeQuotesSafely`.

The existing demo unlock POST seam emits unlock intent and bounded success/failure markers through the no-op runtime provider. The home/report rendering seam marks preview or full-report viewing through the same no-op provider. These calls have no transport or persistence in CP9-01.

The current fixture UI still does not implement real file upload. Quote input events therefore belong at the actual analysis boundary rather than on decorative upload buttons; clicking a scaffold button must not be counted as an accepted quote.

## Private-beta metric definitions

These definitions describe numerators/denominators only. No business target is set in CP9-01.

- **Starts**: count of `comparison_started` events.
- **Valid-input rate**: `quote_input_accepted` / (`quote_input_accepted` + `quote_input_rejected`). This is an input-level reliability signal, not a user conversion rate.
- **Analysis success rate**: `analysis_succeeded` / (`analysis_succeeded` + `analysis_failed`).
- **Preview-to-unlock intent**: `unlock_intent` / `preview_viewed`.
- **Unlock success rate**: `unlock_succeeded` / (`unlock_succeeded` + `unlock_failed`).
- **Full-report completion**: `full_report_viewed` / `unlock_succeeded`.

Because CP9-01 has no durable analytics backend or session/user identifier, these metrics are contract definitions only and are not yet suitable for deduplicated production funnel reporting. A future telemetry provider requires a separately authorized work item and privacy review.

## Invariants

Instrumentation must not change one-time CA$14.99 unlock semantics, report ownership, analysis/reasoning output, canonical uncertainty/source evidence, or CP7 trust behavior. Instrumentation failure must never be used to substitute or fabricate product data.
