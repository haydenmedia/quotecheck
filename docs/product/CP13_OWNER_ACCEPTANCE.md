# CP13 Owner Acceptance Handoff

CP13 is **not complete** until the owner personally performs this test and confirms the generated report is grounded in the two real quotes selected during the test.

## Preconditions

- Use a build containing the independently QA-passed CP13-05 head.
- Do not use production payment/provider/storage configuration for this acceptance gate unless separately authorized under the risk policy.
- For the current local/test configuration, text-based PDFs and pasted text are supported end to end. Image/screenshot/photo selection is real, but analysis must fail explicitly with the provider-required message when no image OCR provider is configured.

## Owner test: two real quotes

1. Open QuoteCheck and scroll to **Add 2–3 real quotes**.
2. In **Quote 1**, choose a real text-based PDF or paste the complete text from a real quote. Confirm the selected source is visibly identified.
3. In **Quote 2**, choose a different real text-based PDF or paste the complete text from a second real quote. Confirm the selected source is visibly identified.
4. Optionally add Quote 3, then remove or replace it once to confirm the control changes the selected source rather than leaving stale input behind.
5. Confirm **Analyze my quotes** is disabled until Quote 1 and Quote 2 are both selected, then becomes enabled.
6. Click **Analyze my quotes** once.
7. Confirm QuoteCheck opens the generated report/preview rather than the static example report.
8. Check at least three concrete facts that are easy to recognize from the exact quotes you supplied: vendor names, quoted totals, inclusions/exclusions, warranty, timeline, or payment terms. They must match the real source documents.
9. Check at least one comparison/finding and its evidence. It must refer to the selected quotes; it must not introduce a fee, fact, exclusion, or certainty that the quotes did not support.
10. Where applicable, confirm these trust rules: an explicit exclusion is shown as an exclusion rather than an omission; an unstated item is not presented as evidence of an extra charge; ambiguous/unreadable content stays uncertain; arithmetic mismatch is a warning rather than silently corrected; a clean comparison may validly report no material concern.
11. Exercise the current preview/unlock path. Confirm the full report is the same analysis session and does not switch to a demo or different report.
12. Refresh/navigate within the supported local session flow and confirm QuoteCheck does not replace a missing/failed generated report with demo content.

## Image failure check while OCR is unconfigured

1. Replace Quote 1 with a screenshot/photo or JPG/PNG quote while leaving Quote 2 valid.
2. Click **Analyze my quotes**.
3. Expected result: QuoteCheck explicitly says image text extraction is not configured (or equivalent provider-required wording). It must not fabricate OCR text or generate a convincing report from demo/fixture data.

## Acceptance statement

Owner acceptance should record:

- the CP13-05 PR number and exact QA-passed head SHA;
- that at least two real quotes were personally selected/uploaded;
- that Analyze produced a report grounded in those exact inputs;
- whether preview/unlock stayed on that same report;
- whether any fabricated or unsupported fact/fee was observed;
- explicit **ACCEPT** or **REJECT**.

Only an explicit owner **ACCEPT** permits PM to close CP13 and mark the commercial milestone complete.
