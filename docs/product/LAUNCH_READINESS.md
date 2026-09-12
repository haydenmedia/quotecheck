# CP12 launch-readiness foundation

CP12-01 prepares the existing golden journey for launch education without deploying or changing any live payment, provider, storage, DNS, secret, customer-communication, or advertising system.

## First-visit contract

A stranger should understand before interacting that QuoteCheck is a practical quote-comparison second opinion, not a professional verdict. The journey is:

1. add 2–3 quotes;
2. receive a useful free preview;
3. optionally unlock the same completed report once for CA$14.99;
4. review the remaining grounded findings, source evidence, uncertainty, scope differences and questions.

Initial categories remain bounded to General, Automotive, Renovation, and Trades / Home Services. This checkpoint adds no procurement, vendor CRM, marketplace, quote solicitation, project-management, or subscription product scope.

## Trust claims allowed on launch surfaces

Launch copy may describe implemented behavior only:

- factual callouts retain source evidence and uncertainty;
- `not stated` remains distinct from an explicit exclusion;
- potential risks and inferences remain qualified as possibilities rather than invented facts or charges;
- the system may validly conclude that no material concern is apparent.

Do not claim guaranteed accuracy, guaranteed savings, professional review, guaranteed final cost, or any unsupported outcome.

## Static example boundary

The launch example is product education using deterministic fixture data. It reuses `reportPresentationModel(demoReport, false)`, so it consumes the same canonical report presentation contract as the real report surface while remaining preview-only. Paid-only sections are not projected into the example. The example contains no unlock control and cannot mutate access state.

The existing golden-journey report and CA$14.99 demo access seam remain separate and unchanged.

## Acquisition measurement hypotheses

These are hypotheses for later launch experiments, **not targets or benchmarks**. CP9 event names are reused so future measurement does not invent a second funnel vocabulary.

| Question to test | Existing event semantics | Interpretation |
| --- | --- | --- |
| Do visitors begin a comparison after understanding the product? | `comparison_started` | Compare qualified visits with analysis starts only after a separately authorized telemetry layer exists. |
| Can people provide usable inputs? | `quote_input_accepted`, `quote_input_rejected` | Input-level reliability; not unique-user conversion. |
| Does analysis complete reliably? | `analysis_succeeded`, `analysis_failed` | Operational success ratio. |
| Is the free preview valuable enough to create purchase intent? | `preview_viewed` -> `unlock_intent` | Hypothesis only; no conversion target is set. |
| Does the unlock path complete when someone intends to buy? | `unlock_succeeded`, `unlock_failed` | Payment/access-path reliability once a live path is explicitly authorized. |
| Do unlocked users reach the complete report? | `unlock_succeeded` -> `full_report_viewed` | Completion signal, not evidence of satisfaction or business value by itself. |

CP9 remains local/no-op and has no durable user/session identity. Event counts therefore cannot currently be interpreted as deduplicated production conversion analytics.

## Next launch steps and risk gates

The next PM-owned launch plan should sequence work behind the repository risk policy rather than silently turning preparation into production mutation.

- **GREEN:** local copy/layout refinements, deterministic fixtures/tests, docs, mock integrations, branches and PRs.
- **YELLOW:** bounded preview/test-environment mutations or paid model evaluations only when PM evidence records purpose, fixtures/bounds, reversibility and budget.
- **RED — current owner approval required:** production deployment/live behavior changes, live Stripe configuration or charges, production persistence/storage mutation, secrets, DNS/domain changes, customer communication, irreversible deletion and paid advertising.

Before any RED launch action, re-verify the exact production candidate SHA, CI, CP7 trust suite, privacy/data-lifecycle assumptions, access boundary, rollback point and owner approval. No action in CP12-01 authorizes those operations.
