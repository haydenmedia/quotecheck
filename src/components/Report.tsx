import { demoReport } from "@/fixtures/report";
import { formatQuoteTotal } from "@/lib/reasoning";
import { findingLabels, summarizeGutCheck, trustSafeFindingText } from "@/lib/trust";

export function Report() {
  const report = demoReport;
  return (
    <section className="report-shell" aria-labelledby="report-title">
      <div className="section-heading">
        <div><p className="eyebrow">Deterministic preview</p><h2 id="report-title">Three quotes, one clearer decision</h2></div>
        <span className="pill">Renovation</span>
      </div>
      <div className="quote-grid">
        {report.quotes.map((quote) => (
          <article className="quote-card" key={quote.id}>
            <p className="muted">{quote.vendor}</p><strong>{formatQuoteTotal(quote.total)}</strong>
            <dl><div><dt>Timeline</dt><dd>{quote.timeline}</dd></div><div><dt>Warranty</dt><dd>{quote.warranty}</dd></div><div><dt>Payment</dt><dd>{quote.paymentTerms}</dd></div></dl>
          </article>
        ))}
      </div>
      {report.sections.map((section, index) => {
        const locked = section.locked;
        return (
          <section className={`analysis-section ${locked ? "locked" : ""}`} key={section.id}>
            <div className="section-row"><h3>{section.title}</h3>{locked && <span>Full report</span>}</div>
            <div className="finding-list">
              {section.findingIds.map((id) => {
                const finding = report.findings.find((item) => item.id === id)!;
                return (
                  <article className="finding" key={`${section.id}-${id}`}>
                    <span className={`finding-type ${finding.type}`}>{findingLabels[finding.type]}</span>
                    <h4>{finding.title}</h4><p>{trustSafeFindingText(finding)}</p>
                    {finding.questionsToAsk.length > 0 && <p className="question"><b>Ask:</b> {finding.questionsToAsk[0]}</p>}
                  </article>
                );
              })}
            </div>
            {locked && index === 1 && <div className="lock-cover"><strong>4 more decision-critical findings</strong><span>Unlock the complete report to see cost, scope, terms and vendor-specific questions.</span></div>}
          </section>
        );
      })}
      <aside className="unlock-card">
        <div><p className="eyebrow">Complete analysis ready</p><h3>Unlock the full QuoteCheck report</h3><p>See every finding, vendor-specific questions, overall gut check, confidence and limitations.</p></div>
        <button type="button">Unlock for CA$14.99</button>
        <small>Demo only — no live payment is connected.</small>
      </aside>
      <section className="gut-check"><h3>Overall gut check</h3><p>{summarizeGutCheck(report)}</p><ul>{report.confidenceLimitations.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </section>
  );
}
