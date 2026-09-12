import { describe, expect, it } from "vitest";
import { buildSafeAccessRedirect, publicAccessMessage } from "@/lib/data-lifecycle";

describe("data lifecycle public boundary", () => {
  it("does not place report/session identifiers or source content into redirect URLs", () => {
    const source = "Vendor: Alpha Auto\nTotal: $4,250";
    const destination = buildSafeAccessRedirect(
      `https://quotecheck.test/api/demo-unlock?session=secret-session&quote=${encodeURIComponent(source)}`,
      "unlocked",
      "full-report",
    );

    expect(destination.pathname).toBe("/");
    expect(destination.search).toBe("?access=unlocked");
    expect(destination.hash).toBe("#full-report");
    expect(destination.toString()).not.toContain("secret-session");
    expect(destination.toString()).not.toContain("Alpha");
    expect(destination.toString()).not.toContain("4%2C250");
  });

  it("returns bounded public messages without echoing arbitrary input", () => {
    const secret = "provider stack: Vendor Alpha evidence excerpt";
    expect(publicAccessMessage(secret)).toBeNull();
    expect(publicAccessMessage("unknown-session")).toBe(
      "That report session could not be found. Your report remains locked; return to the preview and try again.",
    );
    expect(publicAccessMessage("locked")).toBe(
      "Unlock was not completed. Your report remains safely available in preview.",
    );
  });
});
