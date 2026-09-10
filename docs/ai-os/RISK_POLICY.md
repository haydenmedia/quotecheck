# Risk Policy

## GREEN
Local code, documentation, deterministic tests, fixtures, mock integrations, branches and PRs. Autonomous execution allowed inside authorized scope.

## YELLOW
Bounded paid model evaluations and preview/test-environment mutations. Require explicit PM evidence defining purpose, fixture set/bounds, reversibility and budget before execution.

## RED
Production deployment that materially changes live behaviour, live payment-provider charges/configuration, production database/storage mutation, secret changes or disclosure, DNS/domain mutation, customer communication, irreversible deletion and paid advertising. Requires explicit current owner approval.

Prefer reversible changes. Never convert uncertainty into fabricated evidence.
