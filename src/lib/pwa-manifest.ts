export const WEB_APP_MANIFEST = {
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
} as const;

export function buildWebAppManifest() {
  return WEB_APP_MANIFEST;
}
