import { describe, expect, it } from "vitest";
import { APP_METADATA, APP_VIEWPORT } from "../src/lib/pwa-metadata";
import { buildWebAppManifest } from "../src/lib/pwa-manifest";

describe("CP11 PWA packaging baseline", () => {
  it("provides a bounded standards-based manifest with a local icon", () => {
    expect(buildWebAppManifest()).toEqual({
      name: "QuoteCheck",
      short_name: "QuoteCheck",
      description: "Compare 2–3 quotes and get a grounded second opinion before you commit.",
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f7f4ee",
      theme_color: "#13221a",
      icons: [
        {
          src: "/icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any",
        },
      ],
    });
  });

  it("wires explicit application and mobile viewport metadata", () => {
    expect(APP_METADATA.title).toBe("QuoteCheck");
    expect(APP_METADATA.applicationName).toBe("QuoteCheck");
    expect(APP_METADATA.manifest).toBe("/manifest.webmanifest");
    expect(APP_METADATA.icons).toEqual({
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    });
    expect(APP_VIEWPORT).toEqual({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
      themeColor: "#13221a",
    });
  });

  it("does not advertise offline behavior or introduce private-data cache configuration", () => {
    const serialized = JSON.stringify(buildWebAppManifest()).toLowerCase();
    expect(serialized).not.toContain("serviceworker");
    expect(serialized).not.toContain("cache");
    expect(serialized).not.toContain("offline");
    expect(serialized).not.toContain("session");
    expect(serialized).not.toContain("payment");
    expect(serialized).not.toContain("report");
    expect(serialized).not.toContain("quote_text");
  });
});
