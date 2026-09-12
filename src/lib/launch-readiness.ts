export const launchCategories = [
  "General",
  "Automotive",
  "Renovation",
  "Trades / Home Services",
] as const;

export const launchJourney = [
  {
    step: "1",
    title: "Add 2–3 quotes",
    body: "Use PDF, screenshot, photo or pasted text so the same decision can be compared side by side.",
  },
  {
    step: "2",
    title: "Get a useful free preview",
    body: "See the quote basics and key grounded findings before deciding whether the full report is worth unlocking.",
  },
  {
    step: "3",
    title: "Unlock once for CA$14.99",
    body: "One report, one payment. No subscription and no weaker second analysis after payment.",
  },
  {
    step: "4",
    title: "Review the grounded full report",
    body: "Compare scope, terms, potential risks, uncertainty and vendor-specific questions with source evidence attached.",
  },
] as const;

export const launchTrustPoints = [
  {
    title: "Evidence stays attached",
    body: "QuoteCheck keeps source evidence and uncertainty with factual callouts instead of quietly turning unclear text into certainty.",
  },
  {
    title: "Missing is not excluded",
    body: "A detail that is not stated remains not stated. It is only called excluded when the quote explicitly says so.",
  },
  {
    title: "Risks stay qualified",
    body: "Potential risks and inferences are labelled as possibilities, not presented as charges or facts that the quote never stated.",
  },
  {
    title: "No problem is a valid result",
    body: "If nothing material stands out, the report can say that instead of manufacturing a warning to look useful.",
  },
] as const;

export const launchExample = {
  eyebrow: "Static example",
  title: "See how a QuoteCheck report handles uncertainty",
  body: "The report below uses deterministic fixture data for product education. It is not analysis of your quote, and the example never exposes paid-only findings in preview state.",
  cta: "View the example preview",
} as const;
