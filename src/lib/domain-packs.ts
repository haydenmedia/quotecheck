import type { QuoteCategory } from "@/lib/types";

export interface DomainContextPack {
  id: string;
  version: number;
  category: QuoteCategory;
  label: string;
  considerations: readonly string[];
  questions: readonly string[];
  trustNotes: readonly string[];
}

export const DOMAIN_PACKS: Record<QuoteCategory, DomainContextPack> = {
  general: {
    id: "general-v1",
    version: 1,
    category: "general",
    label: "General",
    considerations: ["scope", "totals and fees", "warranty", "timing", "payment terms", "exclusions", "uncertainty"],
    questions: ["What is explicitly included?", "What is explicitly excluded?", "Which important terms are not stated?"],
    trustNotes: ["Absence is not proof of an extra charge.", "Do not convert ambiguity into certainty."],
  },
  automotive: {
    id: "automotive-v1",
    version: 1,
    category: "automotive",
    label: "Automotive",
    considerations: ["parts and labour scope", "diagnostic work", "fees", "warranty", "timeline", "payment terms", "uncertainty"],
    questions: ["Are parts and labour scopes comparable?", "Are diagnostics or programming explicitly addressed?", "What warranty is actually stated?"],
    trustNotes: ["Do not infer OEM/aftermarket status unless stated.", "Do not invent shop supplies or disposal charges."],
  },
  renovation: {
    id: "renovation-v1",
    version: 1,
    category: "renovation",
    label: "Renovation",
    considerations: ["scope", "allowances", "materials", "demolition/disposal", "warranty", "schedule", "payment terms", "exclusions"],
    questions: ["Which allowances could change final cost?", "Are preparation and finishing scopes comparable?", "Which exclusions are explicit rather than merely unstated?"],
    trustNotes: ["Do not assume permits, disposal, or change-order charges exist unless supported.", "Treat allowances as stated uncertainty, not guaranteed overruns."],
  },
  trades: {
    id: "trades-v1",
    version: 1,
    category: "trades",
    label: "Trades / Home Services",
    considerations: ["labour and materials scope", "callout/fees", "warranty", "timeline", "payment terms", "exclusions", "uncertainty"],
    questions: ["Are labour and material scopes comparable?", "Are access/restoration responsibilities stated?", "Which fees or exclusions are explicit?"],
    trustNotes: ["Do not manufacture common trade charges.", "A missing term is not an exclusion."],
  },
};

export function getDomainPack(category: QuoteCategory): DomainContextPack {
  return DOMAIN_PACKS[category];
}
