import type { ReactNode } from "react";
import { APP_METADATA, APP_VIEWPORT } from "@/lib/pwa-metadata";
import "./globals.css";
import "./cp5.css";
import "./cp10.css";
import "./cp12.css";

export const metadata = APP_METADATA;
export const viewport = APP_VIEWPORT;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
