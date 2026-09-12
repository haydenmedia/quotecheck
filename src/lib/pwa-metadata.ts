import type { Metadata, Viewport } from "next";

export const APP_METADATA: Metadata = {
  title: "QuoteCheck",
  description: "Compare quotes without guessing what matters.",
  applicationName: "QuoteCheck",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "QuoteCheck",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const APP_VIEWPORT: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#13221a",
};
