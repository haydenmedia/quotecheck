export type PublicAccessState = "unlocked" | "locked" | "unknown-session";

export function buildSafeAccessRedirect(
  requestUrl: string,
  access: PublicAccessState,
  hash: "report" | "full-report",
): URL {
  const destination = new URL("/", requestUrl);
  destination.searchParams.set("access", access);
  destination.hash = hash;
  return destination;
}

export function publicAccessMessage(access: unknown): string | null {
  if (access === "unknown-session") {
    return "That report session could not be found. Your report remains locked; return to the preview and try again.";
  }
  if (access === "locked") {
    return "Unlock was not completed. Your report remains safely available in preview.";
  }
  return null;
}
