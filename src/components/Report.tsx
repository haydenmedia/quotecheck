import { reportPresentationModel } from "@/lib/report-presentation";
import type { QuoteReport } from "@/lib/types";
import { ReportPrintActions } from "./ReportPrintActions";

type Surface = ReturnType<typeof reportPresentationModel>;
type ScopeView = Surface["quotes"][number]["scopeIncludedDetails"];
type ValueView = Surface["quotes"][number]["warrantyDetail"];

function ScopeValues({ values }: { values: ScopeView }) {
  return <ul className="scope-list">{values.map((item, index) => <li key={`${item.certainty}-${item.label}-${index}`}>
    {item.certainty !== "stated" && <strong>{item.certaintyLabel}: </strong>}<span>{item.label}</span>
    {item.evidence.length > 0 && <details className="scope-evidence"><summary>Source evidence</summary><ul>{item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></details>}
  </li>)}</ul>;
}

function TrustValue({ value }: { value: ValueView }) {
  return <div>{value.certainty !== "stated" && <strong>{value.certaintyLabel}: </strong>}<span>{value.label}</span>{value.evidence.length > 0 && <details className="scope-evidence"><summary>Source evidence</summary><ul>{value.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></details>}</div>;
}

export function Report({ report, reportSessionId, unlocked = false, accessMessage = null }: { report: QuoteReport; reportSessionId: string; unlocked?: boolean; accessMessage?: string | null }) {
  const surface = reportPresentationModel(report, unlocked);
  const headline = surface.headline;
  return <section className={`report-shell ${unlocked ? "report-unlocked" : "report-preview"}`} id="report" aria-labelledby="report-title" data-report-session-id={reportSessionId}>
    {unlocked && <div className="print-report-branding" aria-hidden="true"><strong>{surface.shareFraming.title}</strong><span>{surface.category} quote comparison</span></div>}
    <header className="report-header"><div><p className="eyebrow">Your QuoteCheck report</p><h2 id="report-title">{surface.quotes.length} quotes, one clearer decision</h2><p className="report-intro">Every factual callout stays tied to what your selected quotes actually say.</p></div><span className="pill">{surface.category}</span></header>
    {accessMessage && <p className="access-message no-print" role="status">{accessMessage}</p>}
    <div className="access-banner no-print"><strong>{unlocked ? "Full report unlocked" : "Free preview"}</strong><span>{unlocked ? "You are viewing the complete analysis." : "Your full analysis is already complete. This preview shows the gut check, quote basics and key findings."}</span></div>
    {unlocked && <ReportPrintActions />}
    <aside className="share-framing"><strong>{surface.shareFraming.title}</strong><p>{surface.shareFraming.disclaimer}</p></aside>
    <section className={`report-headline ${headline.tone}`}><div className="headline-kicker">Overall gut check</div><h3>{headline.title}</h3><p>{headline.body}</p></section>
    <section className="comparison-block"><div className="section-row report-subheading"><div><p className="eyebrow">Side by side</p><h3>Compare the quote basics</h3></div><p className="muted">Unknown fields stay unknown. QuoteCheck never turns missing information into a zero or unreadable wording into a clean fact.</p></div><div className="quote-grid" role="list">{surface.quotes.map((quote) => <article className="quote-card" key={quote.id} role="listitem"><div className="quote-vendor"><TrustValue value={quote.vendorDetail} /></div><div className="quote-total"><TrustValue value={quote.totalDetail} /></div><dl><div><dt>Included scope</dt><dd><ScopeValues values={quote.scopeIncludedDetails} /></dd></div><div><dt>Explicit exclusions</dt><dd><ScopeValues values={quote.scopeExcludedDetails} /></dd></div><div><dt>Timeline</dt><dd><TrustValue value={quote.timelineDetail} /></dd></div><div><dt>Warranty</dt><dd><TrustValue value={quote.warrantyDetail} /></dd></div><div><dt>Payment terms</dt><dd><TrustValue value={quote.paymentTermsDetail} /></dd></div></dl></article>)}</div></section>
    <section className="findings-block"><div className="section-row report-subheading"><div><p className="eyebrow">Decision details</p><h3>{unlocked ? "Complete analysis" : "Key findings in your free preview"}</h3></div><p className="muted">Possibilities stay labelled as possibilities. An omission is not the same thing as an exclusion.</p></div>{surface.sections.map((section) => <section className="analysis-section" key={section.id}><div className="section-row"><h4>{section.title}</h4></div><div className="finding-list">{section.findings.map((finding) => <article className={`finding severity-${finding.severity}`} key={`${section.id}-${finding.id}`}><div className="finding-meta"><span className={`finding-type ${finding.type}`}>{finding.typeLabel}</span>{finding.scopeStatusLabel && <span className={`scope-status scope-${finding.scopeStatus}`}>{finding.scopeStatusLabel}</span>}</div><h5>{finding.title}</h5><p>{finding.body}</p>{finding.questionsToAsk.length > 0 && <p className="question"><strong>Ask the vendor:</strong> {finding.questionsToAsk[0]}</p>}{finding.evidence.length > 0 && <details className="evidence"><summary>Source evidence</summary><ul>{finding.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details>}</article>)}</div></section>)}</section>
    {!unlocked ? <aside className="unlock-card no-print"><div><p className="eyebrow">Complete analysis ready</p><h3>Unlock the rest of this report</h3><p>The full report adds the remaining grounded findings from this same completed analysis.</p></div><form action="/api/report-unlock" method="post"><input type="hidden" name="reportSessionId" value={reportSessionId} /><button className="unlock-button" type="submit">Unlock full report</button></form><small>Checkpoint access flow only.</small></aside> : <aside className="unlocked-card no-print" id="full-report"><p className="eyebrow">Report access</p><h3>Full report unlocked</h3><p>This is the same completed analysis shown in the preview.</p><a href="#report">Review report from the top</a></aside>}
    <aside className="limitations"><h3>Confidence & limitations</h3><ul>{surface.confidenceLimitations.map((item) => <li key={item}>{item}</li>)}</ul><p className="source-note"><strong>Source status:</strong> Generated from the selected quote inputs for this report session. No static demo report is substituted into this view.</p></aside>
    {unlocked && <footer className="print-disclaimer"><strong>QuoteCheck second opinion.</strong> {surface.shareFraming.disclaimer}</footer>}
  </section>;
}
