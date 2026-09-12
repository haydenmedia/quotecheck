# Evaluation Plan

Maintain versioned fixture sets covering clean quotes, vague wording, exclusions, mismatched scope, allowances, conditional fees, taxes handled differently, poor scans, contradictory totals, unusually cheap bids, warranty differences and cases where nothing material is wrong.

Track at minimum:
- extraction field accuracy and uncertainty preservation
- arithmetic consistency
- source-grounding correctness
- unsupported factual assertions
- unsupported inference assertions, including same-topic but non-probative evidence
- typed inference provenance against canonical uncertainty, condition, or warning evidence
- important missed findings
- false-positive risk findings
- `not stated` versus `excluded` accuracy
- report usefulness/readability
- latency and model cost for bounded live evaluations

Hard failures include fabricated quote content, invented charges presented as facts, contradictory evidence references, material arithmetic corruption, or hiding material extraction uncertainty.

Inference regressions must include both a same-topic/non-probative case that fails and a genuinely grounded structured-basis case that passes. Topic-word overlap alone is never sufficient provenance for an inference.

Prompt/model changes run against the same versioned evaluation set before promotion. CI remains fixture/mock driven.
