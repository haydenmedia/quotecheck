export const PRIVATE_BETA_EVENT_VERSION = 1 as const;

export const PRIVATE_BETA_EVENT_NAMES = [
  "comparison_started",
  "quote_input_accepted",
  "quote_input_rejected",
  "analysis_succeeded",
  "analysis_failed",
  "preview_viewed",
  "unlock_intent",
  "unlock_succeeded",
  "unlock_failed",
  "full_report_viewed",
] as const;

export type PrivateBetaEventName = (typeof PRIVATE_BETA_EVENT_NAMES)[number];
export type PrivateBetaCategory = "General" | "Automotive" | "Renovation" | "Trades / Home Services";
export type PrivateBetaInputKind = "pasted_text" | "extracted_text_fixture" | "unknown";
export type PrivateBetaFailureCode =
  | "INVALID_QUOTE_COUNT"
  | "UNSUPPORTED_INPUT_TYPE"
  | "OVERSIZED_INPUT"
  | "MALFORMED_INPUT"
  | "ANALYSIS_FAILED"
  | "UNKNOWN_SESSION"
  | "UNLOCK_NOT_CONFIRMED"
  | "UNLOCK_EXCEPTION";

type BaseEvent<Name extends PrivateBetaEventName> = {
  version: typeof PRIVATE_BETA_EVENT_VERSION;
  name: Name;
};

export type PrivateBetaEvent =
  | (BaseEvent<"comparison_started"> & { quoteCount: number; category: PrivateBetaCategory })
  | (BaseEvent<"quote_input_accepted"> & { ordinal: number; inputKind: Exclude<PrivateBetaInputKind, "unknown"> })
  | (BaseEvent<"quote_input_rejected"> & { inputKind: PrivateBetaInputKind; reason: PrivateBetaFailureCode })
  | (BaseEvent<"analysis_succeeded"> & { quoteCount: number; category: PrivateBetaCategory })
  | (BaseEvent<"analysis_failed"> & { quoteCount: number; category: PrivateBetaCategory; reason: PrivateBetaFailureCode })
  | BaseEvent<"preview_viewed">
  | BaseEvent<"unlock_intent">
  | BaseEvent<"unlock_succeeded">
  | (BaseEvent<"unlock_failed"> & { reason: PrivateBetaFailureCode })
  | BaseEvent<"full_report_viewed">;

const EVENT_KEYS: Record<PrivateBetaEventName, readonly string[]> = {
  comparison_started: ["version", "name", "quoteCount", "category"],
  quote_input_accepted: ["version", "name", "ordinal", "inputKind"],
  quote_input_rejected: ["version", "name", "inputKind", "reason"],
  analysis_succeeded: ["version", "name", "quoteCount", "category"],
  analysis_failed: ["version", "name", "quoteCount", "category", "reason"],
  preview_viewed: ["version", "name"],
  unlock_intent: ["version", "name"],
  unlock_succeeded: ["version", "name"],
  unlock_failed: ["version", "name", "reason"],
  full_report_viewed: ["version", "name"],
};

const CATEGORY_VALUES = new Set<PrivateBetaCategory>([
  "General",
  "Automotive",
  "Renovation",
  "Trades / Home Services",
]);
const INPUT_KIND_VALUES = new Set<PrivateBetaInputKind>(["pasted_text", "extracted_text_fixture", "unknown"]);
const FAILURE_VALUES = new Set<PrivateBetaFailureCode>([
  "INVALID_QUOTE_COUNT",
  "UNSUPPORTED_INPUT_TYPE",
  "OVERSIZED_INPUT",
  "MALFORMED_INPUT",
  "ANALYSIS_FAILED",
  "UNKNOWN_SESSION",
  "UNLOCK_NOT_CONFIRMED",
  "UNLOCK_EXCEPTION",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isPrivateBetaEvent(value: unknown): value is PrivateBetaEvent {
  if (!isRecord(value) || value.version !== PRIVATE_BETA_EVENT_VERSION) return false;
  if (typeof value.name !== "string" || !PRIVATE_BETA_EVENT_NAMES.includes(value.name as PrivateBetaEventName)) return false;

  const name = value.name as PrivateBetaEventName;
  const allowedKeys = EVENT_KEYS[name];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) return false;
  if (allowedKeys.some((key) => !(key in value))) return false;

  if ("quoteCount" in value && (!Number.isInteger(value.quoteCount) || (value.quoteCount as number) < 0 || (value.quoteCount as number) > 3)) return false;
  if ("ordinal" in value && (!Number.isInteger(value.ordinal) || (value.ordinal as number) < 1 || (value.ordinal as number) > 3)) return false;
  if ("category" in value && (typeof value.category !== "string" || !CATEGORY_VALUES.has(value.category as PrivateBetaCategory))) return false;
  if ("inputKind" in value && (typeof value.inputKind !== "string" || !INPUT_KIND_VALUES.has(value.inputKind as PrivateBetaInputKind))) return false;
  if ("reason" in value && (typeof value.reason !== "string" || !FAILURE_VALUES.has(value.reason as PrivateBetaFailureCode))) return false;
  if (name === "quote_input_accepted" && value.inputKind === "unknown") return false;

  return true;
}

export interface PrivateBetaInstrumentation {
  record(event: PrivateBetaEvent): void;
}

export class NoopPrivateBetaInstrumentation implements PrivateBetaInstrumentation {
  record(_event: PrivateBetaEvent): void {}
}

export class LocalPrivateBetaInstrumentation implements PrivateBetaInstrumentation {
  readonly events: PrivateBetaEvent[] = [];

  record(event: PrivateBetaEvent): void {
    if (!isPrivateBetaEvent(event)) {
      throw new Error("Invalid private-beta instrumentation event");
    }
    this.events.push(Object.freeze({ ...event }) as PrivateBetaEvent);
  }

  clear(): void {
    this.events.length = 0;
  }
}

export const noopPrivateBetaInstrumentation = new NoopPrivateBetaInstrumentation();

export function recordPrivateBetaEvent(
  instrumentation: PrivateBetaInstrumentation,
  event: PrivateBetaEvent,
): void {
  if (!isPrivateBetaEvent(event)) {
    throw new Error("Invalid private-beta instrumentation event");
  }
  instrumentation.record(event);
}
