# QuoteCheck Owner Dashboard

## Working now
**CP7-01 — Deterministic trust evaluation harness**, Issue #14 / PR #18, is PM-owned as `VERIFICATION_FAILED`. Builder forward work is frozen while the repeated AC4 source-grounding failure is redesigned at the contract boundary.

## Just finished
Independent QA reviewed PR #18 exact head `0714e6f94aa4ce61c85a4b8db21c559cf6a61fb5`; exact-head CI `34672901390` is green, but QA demonstrated that the structured proposition metadata can disagree with the actual inference prose and that condition provenance can be assigned an unrelated allow-listed subject.

## Broken
Inference grounding still has two coupled identity problems: (1) the evaluator trusts self-declared subject/interpretation metadata without proving that the rendered finding asserts that proposition; (2) a canonical condition can be relabelled as an unrelated subject. A scheduling condition can therefore accompany `Vendor Acme appears unreliable` while claiming a timeline/contingent basis.

## Human action required
None. This is an internal architecture/quality gate; no owner approval is required yet.

## Next
PM must define a bounded structural redesign before Builder resumes. Preferred direction: make a closed structured finding/proposition representation canonical and derive user-facing inference prose from it, so descriptor/prose mismatch is impossible by construction; bind every provenance node to its canonical subject rather than accepting a global subject allow-list. Required deterministic regressions: descriptor/prose mismatch cannot exist or fails; scheduling condition + unrelated subject FAIL; proposition-compatible scheduling inference PASS; all prior CP7 trust regressions remain. No lexical/topic heuristic patch and no paid/live evaluation.

## Checkpoint progress
- CP0 project OS: complete
- CP1 golden journey scaffold: complete
- CP2 ingestion/canonical extraction foundation: complete
- CP3 grounded reasoning/domain context: complete
- CP4 comparison/report experience: complete
- CP5 free preview/paywall: complete
- CP6 payments/persistence/ownership: complete
- CP7 evaluation quality system: active — CP7-01 escalated; structural inference-grounding redesign required
- CP8–CP12: not started

## Commercial milestone
Target remains: a stranger can upload 2–3 real quotes, receive a useful free preview, pay CA$14.99, and receive a polished grounded report without fabricated findings.
