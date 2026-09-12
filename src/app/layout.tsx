import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./cp5.css";
import "./cp10.css";

export const metadata: Metadata = { title: "QuoteCheck", description: "Compare quotes without guessing what matters." };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
