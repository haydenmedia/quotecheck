# Evaluation Plan

Maintain versioned fixture sets covering clean quotes, vague wording, exclusions, mismatched scope, allowances, conditional fees, taxes handled differently, poor scans, contradictory totals, unusually cheap bids, warranty differences and cases where nothing material is wrong.

Track at minimum:
- extraction field accuracy and uncertainty preservation
- arithmetic consistency
- source-grounding correctness
- unsupported factual assertions
- unsupported inference assertions, including same-topic but non-probative evidence
- structural inference proposition fidelity against canonical typed provenance
- deterministic renderer fidelity for inference title/explanation
- important missed findings
- false-positive risk findings
- `not stated` versus `excluded` accuracy
- report usefulness/readability
- latency and model cost for bounded live evaluations

Hard failures include fabricated quote content, invented charges presented as facts, contradictory evidence references, material arithmetic corruption, or hiding material extraction uncertainty.

Inference regressions must verify the full structural chain: closed proposition variant -> fixed subject/interpretation -> exact same-subject canonical provenance -> deterministic rendered prose. Required cases include: scheduling condition -> vendor unreliable FAIL; payment condition relabelled as timeline FAIL; scheduling condition -> compatible timeline contingency PASS; valid timeline proposition with mismatched vendor prose FAIL; unrelated warranty uncertainty -> vendor inference FAIL; matching warranty uncertainty -> clarification PASS. Cross-subject condition allow-lists and lexical/topic/prose heuristics are not accepted as grounding.

All previous CP7 trust fixtures remain in the deterministic suite, including not-stated/excluded handling, hidden uncertainty, arithmetic corruption, fabricated charge/fact, contradictory evidence, mixed potential-risk dimensions, absence-not-charge, and grounded no-material-concern.

Prompt/model changes run against the same versioned evaluation set before promotion. CI remains fixture/mock driven. Paid/live model evaluation remains YELLOW and is not part of this checkpoint unless explicitly authorized with a bounded fixture set and budget.
