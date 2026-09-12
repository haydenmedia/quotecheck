import { demoReport } from "@/fixtures/report";
import { launchExample } from "@/lib/launch-readiness";
import { reportPresentationModel } from "@/lib/report-presentation";

export function LaunchExampleReport() {
  const example = reportPresentationModel(demoReport, false);
  const visibleFindings = example.sections.flatMap((section) => section.findings).slice(0, 2);

  return (
    <section className="launch-example" id="example-report" aria-labelledby="example-title">
      <div className="launch-heading">
        <p className="eyebrow">{launchExample.eyebrow}</p>
        <h2 id="example-title">{launchExample.title}</h2>
        <p>{launchExample.body}</p>
      </div>

      <div className="example-preview" aria-label="Static QuoteCheck preview example">
        <div className={`example-headline ${example.headline.tone}`}>
          <span>Overall gut check</span>
          <h3>{example.headline.title}</h3>
          <p>{example.headline.body}</p>
        </div>

        <div className="example-quote-grid" role="list" aria-label="Example quote totals">
          {example.quotes.map((quote, index) => (
            <article key={quote.id} role="listitem">
              <span>Quote {index + 1}</span>
              <strong>{quote.totalDetail.label}</strong>
              <small>{quote.totalDetail.certaintyLabel}</small>
            </article>
          ))}
        </div>

        <div className="example-findings" aria-label="Example grounded findings">
          {visibleFindings.map((finding) => (
            <article key={finding.id}>
              <span className={`finding-type ${finding.type}`}>{finding.typeLabel}</span>
              <h3>{finding.title}</h3>
              <p>{finding.body}</p>
            </article>
          ))}
        </div>
      </div>

      <p className="example-boundary"><strong>Example boundary:</strong> this education view always uses preview access. Paid-only findings are not projected into it, and there is no example unlock control.</p>
      <a className="secondary-link" href="#compare">Start with the quote inputs</a>
    </section>
  );
}
