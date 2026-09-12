# Current State

Active checkpoint: **CP7 — Evaluation quality system**.

Active work item: **CP7-01 — Deterministic trust evaluation harness**, Issue #14 / PR #18, status `READY`, owner `Builder`, risk `GREEN`.

Independent QA most recently reviewed exact PR #18 head `8d388ab75b2759ed6b026ea7da8897ce493ba142`. Exact-head CI run `34670356594` passed install, lint, typecheck, deterministic tests/evals and production build. QA still failed AC4 because typed `inferenceBasis` proves that cited evidence is a canonical uncertainty/condition/warning node but does not prove that the node supports the proposition being inferred. Repro: a scheduling-availability condition can currently ground the unrelated qualitative statement `Vendor Acme appears unreliable`.

The repeated source-grounding threshold has been escalated and resolved at the PM architecture level rather than by authorizing another heuristic patch. PM decision v58: material inferences must use proposition-level structured grounding. The report contract must identify the inferred subject/canonical target and an interpretation class, tied to exact canonical basis evidence. Deterministic QA must verify target/evidence correspondence and provenance-compatible interpretation. Lexical/topic-overlap grounding and arbitrary qualitative judgments licensed merely by a typed provenance node are not acceptable.

Builder is authorized one bounded GREEN implementation of this structural repair on PR #18. Required regressions: scheduling condition -> vendor-unreliable inference fails; the same condition -> compatible scheduling inference passes; unrelated uncertainty -> qualitative vendor inference fails; genuinely field-compatible uncertainty inference passes. All prior not-stated, potential-risk, invented-charge, arithmetic, hidden-uncertainty, exclusion/allowance/condition and no-material-concern regressions must remain passing. If this requires broad product-contract churn or prose-semantic heuristics, Builder must stop and return to PM.

No human gate is active. No paid/live model evaluation is authorized; bounded paid eval remains YELLOW and requires explicit PM purpose, fixture set and budget. No production deployment, live payment/provider configuration, production DB/storage mutation, secrets, customer communication, paid ads or other RED action is authorized.

CP6 merged SHA `387b94a17270d3b660534f80deaa846bb818ca3f` remains the verified save-game/rollback point.
