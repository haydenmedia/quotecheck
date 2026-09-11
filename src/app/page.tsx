import { Report } from "@/components/Report";
import { demoReportStore, DEMO_REPORT_SESSION_ID } from "@/lib/demo-access";

const categories = ["General", "Automotive", "Renovation", "Trades / Home Services"];

type HomeProps = {
  searchParams: Promise<{ session?: string | string[]; access?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const requestedSession = typeof params.session === "string" ? params.session : DEMO_REPORT_SESSION_ID;
  const record = requestedSession === DEMO_REPORT_SESSION_ID
    ? await demoReportStore.get(requestedSession)
    : null;
  const unlocked = record?.access === "unlocked";
  const accessMessage = !record
    ? "That report session could not be found. Your report remains locked; return to the preview and try again."
    : record.paymentState === "cancelled" || record.paymentState === "failed" || record.paymentState === "unknown"
      ? "Unlock was not completed. Nothing was charged by this demo and your report remains safely available in preview."
      : null;

  return (
    <main>
      <header className="hero">
        <nav><a className="brand" href="#top">QuoteCheck</a><span>Second opinion for expensive decisions</span></nav>
        <div className="hero-grid" id="top">
          <div><p className="eyebrow">Before you choose the cheapest quote</p><h1>See what the price tag leaves out.</h1><p className="lede">Compare 2–3 quotes side by side, surface unclear scope and potential cost risks, and get the questions worth asking before you commit.</p><a className="primary" href="#compare">Compare my quotes</a><p className="fineprint">A practical gut check, not a professional appraisal or legal opinion.</p></div>
          <div className="hero-proof"><div><span>3</span><p>quotes compared</p></div><div><span>11</span><p>meaningful differences</p></div><div><span>6</span><p>questions worth asking</p></div></div>
        </div>
      </header>
      <section className="compare" id="compare">
        <div className="section-heading"><div><p className="eyebrow">Start here</p><h2>Add 2–3 quotes</h2></div><p>PDF, screenshot, photo or pasted text. This scaffold uses fixture data only.</p></div>
        <div className="upload-grid">
          {[1,2,3].map((number) => <button className="upload" type="button" key={number}><span>+</span><strong>Quote {number}</strong><small>{number < 3 ? "Required for comparison" : "Optional third quote"}</small></button>)}
        </div>
        <fieldset><legend>What kind of quotes are these?</legend><div className="category-grid">{categories.map((category, index) => <label key={category}><input defaultChecked={index === 2} name="category" type="radio" /><span>{category}</span></label>)}</div></fieldset>
        <button className="analyze" type="button">Analyze sample quotes</button>
      </section>
      <Report unlocked={unlocked} reportSessionId={DEMO_REPORT_SESSION_ID} accessMessage={accessMessage} />
    </main>
  );
}
