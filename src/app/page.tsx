import { LaunchExampleReport } from "@/components/LaunchExampleReport";
import { QuoteIntake } from "@/components/QuoteIntake";
import { Report } from "@/components/Report";
import { demoReportStore, DEMO_REPORT_SESSION_ID } from "@/lib/demo-access";
import { publicAccessMessage } from "@/lib/data-lifecycle";
import {
  launchJourney,
  launchTrustPoints,
} from "@/lib/launch-readiness";
import {
  PRIVATE_BETA_EVENT_VERSION,
  noopPrivateBetaInstrumentation,
  recordPrivateBetaEvent,
} from "@/lib/private-beta-instrumentation";

type HomeProps = {
  searchParams: Promise<{ access?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const record = await demoReportStore.get(DEMO_REPORT_SESSION_ID);
  const unlocked = record?.access === "unlocked";
  const access = typeof params.access === "string" ? params.access : null;
  const accessMessage = publicAccessMessage(access);

  recordPrivateBetaEvent(noopPrivateBetaInstrumentation, {
    version: PRIVATE_BETA_EVENT_VERSION,
    name: unlocked ? "full_report_viewed" : "preview_viewed",
  });

  return (
    <main>
      <header className="hero">
        <nav aria-label="Primary navigation">
          <a className="brand" href="#top">QuoteCheck</a>
          <a className="nav-link" href="#how-it-works">How it works</a>
        </nav>
        <div className="hero-grid" id="top">
          <div>
            <p className="eyebrow">A second opinion before you commit</p>
            <h1>Compare the quotes, not just the totals.</h1>
            <p className="lede">QuoteCheck compares 2–3 quotes side by side, keeps uncertainty visible, surfaces meaningful differences and potential risks, and gives you the questions worth asking before you choose.</p>
            <div className="hero-actions">
              <a className="primary" href="#compare">Compare my quotes</a>
              <a className="secondary-link" href="#example-report">See a static example</a>
            </div>
            <p className="fineprint">A practical second opinion based on the supplied quotes — not a professional appraisal, legal opinion, engineering review, or guarantee of final cost.</p>
          </div>
          <aside className="hero-proof" aria-label="Static example summary">
            <p className="example-label">In the static example</p>
            <div><span>3</span><p>quotes compared</p></div>
            <div><span>11</span><p>grounded findings</p></div>
            <div><span>6</span><p>questions to ask</p></div>
          </aside>
        </div>
      </header>

      <section className="launch-section" id="how-it-works" aria-labelledby="journey-title">
        <div className="launch-heading">
          <p className="eyebrow">How QuoteCheck works</p>
          <h2 id="journey-title">From quotes to a clearer decision</h2>
          <p>You can see whether the analysis is useful before paying. The one-time unlock reveals the remaining grounded findings from the same completed report.</p>
        </div>
        <ol className="journey-grid">
          {launchJourney.map((item) => (
            <li key={item.step}>
              <span aria-hidden="true">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="trust-section" aria-labelledby="trust-title">
        <div className="launch-heading">
          <p className="eyebrow">Grounded by design</p>
          <h2 id="trust-title">What the report will — and will not — claim</h2>
          <p>QuoteCheck is designed to preserve what the quote actually says, including when the right answer is uncertain, not stated, or simply uneventful.</p>
        </div>
        <div className="trust-grid">
          {launchTrustPoints.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <LaunchExampleReport />
      <QuoteIntake />
      <Report unlocked={unlocked} accessMessage={accessMessage} />
    </main>
  );
}
