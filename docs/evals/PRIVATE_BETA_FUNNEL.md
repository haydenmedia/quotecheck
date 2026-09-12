# CP9 local private-beta funnel summary

This checkpoint remains deterministic, local/in-memory, provider-neutral instrumentation for QA and private-beta verification. It is not production analytics and it has no durable user/session identity.

## Summary metrics

`summarizePrivateBetaFunnel(events)` accepts only events that satisfy the versioned `PrivateBetaEvent` contract. Invalid versions, unknown event names, extra/private payload fields, or otherwise malformed events are rejected rather than summarized.

| Metric | Numerator | Denominator |
| --- | --- | --- |
| starts | `comparison_started` count | n/a |
| valid-input rate | `quote_input_accepted` | accepted + `quote_input_rejected` |
| analysis success rate | `analysis_succeeded` | succeeded + `analysis_failed` |
| preview-to-unlock intent | `unlock_intent` | `preview_viewed` |
| unlock success rate | `unlock_succeeded` | succeeded + `unlock_failed` |
| full-report completion | `full_report_viewed` | `unlock_succeeded` |

Any rate with a zero denominator returns `rate: null` and `status: "not_enough_data"`. Zero is a valid rate only when the denominator is non-zero and the observed numerator is zero.

## Golden-journey event coverage

- Comparison start, accepted/rejected quote inputs, and analysis success/failure are emitted at the instrumented analysis boundary (`src/lib/instrumented-analysis.ts`).
- Preview and full-report views are emitted at the report rendering seam (`src/app/page.tsx`).
- Unlock intent plus unlock success/failure are emitted at the existing one-time unlock seam (`src/app/api/demo-unlock/route.ts`).
- No decorative clicks or unrelated UI actions are counted.

Every documented rate therefore has a real numerator and denominator path in the existing journey. CP9-02 adds summarization only; it does not change extraction, reasoning, report ownership, payment semantics, or UI scope.

## Interpretation limits

Treat the output as event-count diagnostics, not unique-user conversion analytics. A value such as `0.5` means the observed numerator event count is half the observed denominator event count in the supplied in-memory stream. Because there is no durable user/session identity, events cannot be deduplicated or attributed across people or sessions, and unusual/replayed streams can yield ratios above 1. Do not clamp or reinterpret them as user conversion percentages.

The summary contains only bounded event counts/rates. It must not receive or persist quote text, source evidence, vendor/customer identity, report content, payment details, provider/model data, secrets, or session identifiers. No analytics SDK, network transport, persistence, cookies, or consent changes are introduced by this utility.
