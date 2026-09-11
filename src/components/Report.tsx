import { demoReport } from "@/fixtures/report";
import { demoUnlockCopy, reportSurface } from "@/lib/report-presentation";

type ScopeView = ReturnType<typeof reportSurface>["quotes"][number]["scopeIncludedDetails"];
type ValueView = ReturnType<typeof reportSurface>["quotes"][number]["warrantyDetail"];

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

export function Report({
  unlocked = false,
  reportSessionId,
  accessMessage = null,
}: {
  unlocked?: boolean;
  reportSessionId: string;
  accessMessage?: string | null;
}) {
  const surface = reportSurface(demoReport, unlocked);
  const headline = surface.headline;

  return (
    <section className="report-shell" id="report" aria-labelledby="report-title">
      <header className="report-header">
        <div>
          <p className="eyebrow">Your QuoteCheck report</p>
          <h2 id="report-title">Three quotes, one clearer decision</h2>
          <p className="report-intro">Start with the gut check, then compare the details. Every factual callout stays tied to what the quotes actually say.</p>
        </div>
        <span className="pill">Renovation</span>
      </header>

      {accessMessage && <p className="access-message" role="status">{accessMessage}</p>}

      <div className="access-banner" aria-label={unlocked ? "Full report unlocked" : "Free preview"}>
        <strong>{unlocked ? "Full report unlocked" : "Free preview"}</strong>
        <span>{unlocked ? "You are viewing the complete analysis." : "Your full analysis is already complete. This preview shows the gut check, quote basics and key findings."}</span>
      </div>

      <section className={`report-headline ${headline.tone}`} aria-labelledby="gut-check-title">
        <div className="headline-kicker">Overall gut check</div>
        <h3 id="gut-check-title">{headline.title}</h3>
        <p>{headline.body}</p>
      </section>

      <section className="comparison-block" aria-labelledby="compare-quotes-title">
        <div className="section-row report-subheading">
          <div><p className="eyebrow">Side by side</p><h3 id="compare-quotes-title">Compare the quote basics</h3></div>
          <p className="muted">Unknown fields stay unknown. QuoteCheck never turns missing information into a zero or unreadable wording into a clean fact.</p>
        </div>
        <div className="quote-grid" role="list">
          {surface.quotes.map((quote) => {
            const vendorName = quote.vendorDetail.certainty === "stated" ? quote.vendorDetail.label : "Vendor";
            return (
              <article className="quote-card" key={quote.id} role="listitem">
                <div className="quote-vendor"><TrustValue value={quote.vendorDetail} /></div>
                <div className="quote-total" aria-label={`Quoted total for ${vendorName}: ${quote.totalDetail.label}`}><TrustValue value={quote.totalDetail} /></div>
                <dl>
                  <div><dt>Included scope</dt><dd><ScopeValues values={quote.scopeIncludedDetails} /></dd></div>
                  <div><dt>Explicit exclusions</dt><dd><ScopeValues values={quote.scopeExcludedDetails} /></dd></div>
                  <div><dt>Timeline</dt><dd><TrustValue value={quote.timelineDetail} /></dd></div>
                  <div><dt>Warranty</dt><dd><TrustValue value={quote.warrantyDetail} /></dd></div>
                  <div><dt>Payment terms</dt><dd><TrustValue value={quote.paymentTermsDetail} /></dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="findings-block" aria-labelledby="findings-title">
        <div className="section-row report-subheading">
          <div><p className="eyebrow">Decision details</p><h3 id="findings-title">{unlocked ? "Complete analysis" : "Key findings in your free preview"}</h3></div>
          <p className="muted">Possibilities stay labelled as possibilities. An omission is not the same thing as an exclusion.</p>
        </div>
        {surface.sections.map((section) => (
          <section className="analysis-section" key={section.id} aria-labelledby={`${section.id}-title`}>
            <div className="section-row"><h4 id={`${section.id}-title`}>{section.title}</h4></div>
            <div className="finding-list">{section.findings.map((finding) => (
              <article className={`finding severity-${finding.severity}`} key={`${section.id}-${finding.id}`}>
                <div className="finding-meta">
                  <span className={`finding-type ${finding.type}`}>{finding.typeLabel}</span>
                  {finding.scopeStatusLabel && <span className={`scope-status scope-${finding.scopeStatus}`}>{finding.scopeStatusLabel}</span>}
                </div>
                <h5>{finding.title}</h5>
                <p>{finding.body}</p>
                {finding.questionsToAsk.length > 0 && <p className="question"><strong>Ask the vendor:</strong> {finding.questionsToAsk[0]}</p>}
                {finding.evidence.length > 0 && <details className="evidence"><summary>Source evidence</summary><ul>{finding.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details>}
              </article>
            ))}</div>
          </section>
        ))}
      </section>

      {!unlocked ? (
        <aside className="unlock-card" aria-labelledby="unlock-title">
          <div>
            <p className="eyebrow">Complete analysis ready</p>
            <h3 id="unlock-title">Unlock the rest of this report</h3>
            <p>The full report adds the remaining grounded findings, potential additional costs, missing or unclear details, scope differences, terms and vendor-specific questions.</p>
            <ul className="unlock-benefits">
              <li>Same analysis already completed — no weaker free model and no re-generation after unlock.</li>
              <li>Source evidence and uncertainty stay attached to findings.</li>
              <li>One report, one payment. No subscription.</li>
            </ul>
          </div>
          <form action="/api/demo-unlock" method="post">
            <input type="hidden" name="reportSessionId" value={reportSessionId} />
            <button className="unlock-button" type="submit" aria-label={`Unlock the full QuoteCheck report for ${demoUnlockCopy.price} one-time`}>
              Unlock full report — {demoUnlockCopy.price} {demoUnlockCopy.cadence}
            </button>
          </form>
          <small>Deterministic demo checkout only — no payment is collected or connected.</small>
        </aside>
      ) : (
        <aside className="unlocked-card" id="full-report" aria-labelledby="unlocked-title">
          <p className="eyebrow">Demo access</p>
          <h3 id="unlocked-title">Full report unlocked</h3>
          <p>This is the same completed analysis shown in the preview, with the remaining report sections now presented.</p>
          <a href="#report">Review report from the top</a>
        </aside>
      )}

      <aside className="limitations" aria-labelledby="limitations-title">
        <h3 id="limitations-title">Confidence & limitations</h3>
        <ul>{surface.confidenceLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="source-note"><strong>Source status:</strong> Deterministic fixture data. No live extraction or model call is used in this checkpoint.</p>
      </aside>
    </section>
  );
}
