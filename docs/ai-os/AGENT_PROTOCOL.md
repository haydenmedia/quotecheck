# Agent Protocol

GitHub is canonical. Begin from `docs/ai-os/CONTROL_STATE.json`, then inspect current issues, PRs, commits, CI and relevant docs. Never treat chat memory or another agent summary as evidence.

## Roles
- PM owns project state, prioritization, issues and docs; PM does not implement product code.
- Builder is the sole product-code mutation owner and works on scoped branches/PRs.
- Independent QA verifies the exact PR head and does not silently fix Builder work.

Maintain one active checkpoint and normally one active implementation item. Ineligible workers no-op but remain available. A work item is complete only after reproducible independent QA evidence. Stop and escalate after three repeated failure cycles on the same root issue.

Before major architecture/provider/payment/storage changes, record a save-game snapshot: known-good SHA, verified behaviour, risks and rollback point.
