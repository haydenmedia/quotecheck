# CP11 packaging decision

## Decision

QuoteCheck remains **web-first with a standards-based PWA installability baseline** through the first commercial milestone. Do not create an iOS/Android wrapper yet.

The current repository is a single Next.js application with one grounded analysis/report model, one CA$14.99 access boundary, browser-owned print/save-to-PDF behavior, and privacy rules designed around server/runtime boundaries. A native wrapper would add release, signing, store-review, platform-permission, payment-policy, and regression surface without removing a demonstrated launch blocker.

This decision is intentionally reversible. A future wrapper must reuse the same web/API/report contracts rather than fork extraction, reasoning, access, report, or trust logic.

## Repository evidence

- The primary journey is already mobile-first web UI: 2–3 quote inputs, category selection, preview, one-time unlock, and the grounded report all live in the Next.js app.
- The current quote-input surface advertises PDF, screenshot, photo, and pasted text, but the page still states that the scaffold uses fixture data. Native packaging would not make that ingestion path real; completing the web journey is the higher-value milestone work.
- The report presentation model is shared by browser display and print/save-to-PDF. Browser print/save remains browser-owned and should not be represented as a native PDF subsystem.
- CP8 data-lifecycle boundaries deliberately avoid exposing report-session identifiers and do not authorize persistence or caching expansion.
- CP9 instrumentation is local/provider-neutral and has no durable user/session identity. Native packaging is not needed for the current measurement contract.

## Why PWA first

### First commercial milestone

The milestone is a stranger completing the quote journey and receiving a useful, grounded report without fabricated findings. Installation in an app store is not required to prove that value. A lightweight web install surface improves repeat access without creating a second product brain.

### Maintenance burden

A native wrapper now would introduce platform-specific build tooling, certificates/signing, store metadata, review cycles, OS-specific permissions, and release coordination. None of those solve a currently evidenced product-quality or trust gap.

### Offline behavior

QuoteCheck does **not** claim offline analysis or offline report access. CP11 adds no service worker, cache storage, background sync, IndexedDB persistence, or other offline data layer. Private quote, report, payment, and session data must not be cached by new application code in this checkpoint.

If a later milestone needs offline behavior, it requires a separate privacy/security design and deterministic verification before any such claim is made.

### Camera and file intake

Browser file/photo capture capabilities are sufficient to continue validating the mobile-first journey. If real-device testing later proves that browser camera/file flows materially prevent successful quote capture, that would be concrete evidence to reconsider a wrapper. Until then, a wrapper would be speculation with a build pipeline attached.

### Payments

The commercial contract is a one-time CA$14.99 unlock. CP11 does not change payment semantics or provider configuration. A native wrapper could introduce app-store payment-policy constraints and should therefore wait until after the web commercial milestone unless platform distribution becomes a proven requirement.

### Report printing and sharing

Current print/save-to-PDF behavior is intentionally browser-owned. Support and UX vary by browser and OS. CP11 does not claim identical print/save behavior across platforms and does not introduce a native sharing layer.

### Trust, privacy, and security

The existing extraction/reasoning separation, source grounding, uncertainty preservation, ownership/access boundaries, and data-lifecycle rules stay canonical. A future native shell may call the same contracts, but it must not duplicate or reinterpret them locally.

## Installability baseline added in CP11

The app now exposes:

- a standards-based web app manifest;
- explicit mobile viewport metadata;
- application name/theme metadata;
- a local application icon referenced by the manifest and document metadata.

This is an installability **baseline**, not a guarantee that every browser or OS will show an install prompt. Installation UI and eligibility vary by browser/OS and may change independently of QuoteCheck.

No service worker or offline cache is added. Consequently, QuoteCheck must continue to be described as an online web application even when launched from an installed shortcut/window.

## Reconsider native packaging when evidence exists

Revisit a native wrapper only if one or more of these become true after the commercial milestone:

1. real-device browser testing shows material camera/file-intake failure that cannot be fixed reasonably on the web;
2. app-store distribution becomes an evidenced acquisition requirement;
3. push notifications, background processing, or another native-only capability becomes core to a validated product need;
4. browser-owned print/share limitations materially prevent customers from using paid reports;
5. security or enterprise deployment requirements make a managed native shell meaningfully safer than the web delivery model.

Any future wrapper should remain a thin delivery shell over the same server/API/report contracts, with no independent extraction, reasoning, entitlement, or report implementation.
