import { demoReport } from "@/fixtures/report";
import { presentFinding, presentQuoteSummary, reportHeadline, visibleSections } from "@/lib/report-presentation";

type ScopeView = ReturnType<typeof presentQuoteSummary>["scopeIncludedDetails"];
type ValueView = ReturnType<typeof presentQuoteSummary>["warrantyDetail"];

function ScopeValues({ values }: { values: ScopeView }) {
  return (
    <ul className="scope-list">
      {values.map((item, index) => (
        <li key={`${item.certainty}-${item.label}-${index}`}>
          {item.certainty !== "stated" && <strong>{item.certaintyLabel}: </strong>}
          <span>{item.label}</span>
          {item.evidence.length > 0 && (
            <details className="scope-evidence"><summary>Source evidence</summary><ul>{item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></details>
          )}
        </li>
      ))}
    </ul>
  );
}

function TrustValue({ value }: { value: ValueView }) {
  return (
    <div>
      {value.certainty !== "stated" && <strong>{value.certaintyLabel}: </strong>}
      <span>{value.label}</span>
      {value.evidence.length > 0 && (
        <details className="scope-evidence"><summary>Source evidence</summary><ul>{value.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></details>
      )}
    </div>
  );
}

export function Report() {
  const report = demoReport;
  const headline = reportHeadline(report);
  const sections = visibleSections(report, false);

  return (
    <section className="report-shell" aria-labelledby="report-title">
      <header className="report-header"><div><p className="eyebrow">Your QuoteCheck report</p><h2 id="report-title">Three quotes, one clearer decision</h2><p className="report-intro">Start with the gut check, then compare the details. Every factual callout stays tied to what the quotes actually say.</p></div><span className="pill">Renovation</span></header>

      <section className={`report-headline ${headline.tone}`} aria-labelledby="gut-check-title"><div className="headline-kicker">Overall gut check</div><h3 id="gut-check-title">{headline.title}</h3><p>{headline.body}</p></section>

      <section className="comparison-block" aria-labelledby="compare-quotes-title">
        <div className="section-row report-subheading"><div><p className="eyebrow">Side by side</p><h3 id="compare-quotes-title">Compare the quote basics</h3></div><p className="muted">Unknown fields stay unknown. QuoteCheck never turns missing information into a zero or unreadable wording into a clean fact.</p></div>
        <div className="quote-grid" role="list">
          {report.quotes.map((quote) => {
            const view = presentQuoteSummary(quote);
            const vendorName = view.vendorDetail.certainty === "stated" ? view.vendorDetail.label : "Vendor";
            return (
              <article className="quote-card" key={quote.id} role="listitem">
                <div className="quote-vendor"><TrustValue value={view.vendorDetail} /></div>
                <div className="quote-total" aria-label={`Quoted total for ${vendorName}: ${view.totalDetail.label}`}><TrustValue value={view.totalDetail} /></div>
                <dl>
                  <div><dt>Included scope</dt><dd><ScopeValues values={view.scopeIncludedDetails} /></dd></div>
                  <div><dt>Explicit exclusions</dt><dd><ScopeValues values={view.scopeExcludedDetails} /></dd></div>
                  <div><dt>Timeline</dt><dd><TrustValue value={view.timelineDetail} /></dd></div>
                  <div><dt>Warranty</dt><dd><TrustValue value={view.warrantyDetail} /></dd></div>
                  <div><dt>Payment terms</dt><dd><TrustValue value={view.paymentTermsDetail} /></dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="findings-block" aria-labelledby="findings-title">
        <div className="section-row report-subheading"><div><p className="eyebrow">Decision details</p><h3 id="findings-title">What deserves your attention</h3></div><p className="muted">Possibilities stay labelled as possibilities. An omission is not the same thing as an exclusion.</p></div>
        {sections.map((section) => {
          if (section.isLocked) return <section className="analysis-section locked-section" key={section.id} aria-labelledby={`${section.id}-title`}><div className="section-row"><h4 id={`${section.id}-title`}>{section.title}</h4><span className="lock-label" aria-label="Available in full report">Full report</span></div><p className="locked-copy">This section is ready, but its findings are hidden in the free preview.</p></section>;
          return (
            <section className="analysis-section" key={section.id} aria-labelledby={`${section.id}-title`}>
              <div className="section-row"><h4 id={`${section.id}-title`}>{section.title}</h4></div>
              <div className="finding-list">{section.findingIds.map((id) => {
                const finding = report.findings.find((item) => item.id === id); if (!finding) return null; const view = presentFinding(finding);
                return <article className={`finding severity-${finding.severity}`} key={`${section.id}-${id}`}><div className="finding-meta"><span className={`finding-type ${finding.type}`}>{view.typeLabel}</span>{view.scopeStatusLabel && <span className={`scope-status scope-${finding.scopeStatus}`}>{view.scopeStatusLabel}</span>}</div><h5>{finding.title}</h5><p>{view.body}</p>{finding.questionsToAsk.length > 0 && <p className="question"><strong>Ask the vendor:</strong> {finding.questionsToAsk[0]}</p>}{view.evidence.length > 0 && <details className="evidence"><summary>Source evidence</summary><ul>{view.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details>}</article>;
              })}</div>
            </section>
          );
        })}
      </section>

      <aside className="unlock-card" aria-labelledby="unlock-title"><div><p className="eyebrow">Complete analysis ready</p><h3 id="unlock-title">Unlock the full QuoteCheck report</h3><p>See potential additional costs, missing details, scope differences, terms and vendor-specific questions.</p></div><button type="button">Unlock for CA$14.99</button><small>Demo only — no live payment is connected.</small></aside>
      <aside className="limitations" aria-labelledby="limitations-title"><h3 id="limitations-title">Confidence & limitations</h3><ul>{report.confidenceLimitations.map((item) => <li key={item}>{item}</li>)}</ul><p className="source-note"><strong>Source status:</strong> Deterministic fixture data. No live extraction or model call is used in this checkpoint.</p></aside>
    </section>
  );
}
