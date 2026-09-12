import type { MetadataRoute } from "next";

export const WEB_APP_MANIFEST: MetadataRoute.Manifest = {
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
};

export function buildWebAppManifest(): MetadataRoute.Manifest {
  return WEB_APP_MANIFEST;
}
