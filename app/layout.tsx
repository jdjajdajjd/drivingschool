import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const ui = Geist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pearl Index - Curated skills for coding agents",
    template: "%s - Pearl Index",
  },
  description: "A polished catalog of practical skills for Codex, ChatGPT, Claude, and AI coding agents.",
  metadataBase: new URL("https://pearl-index.local"),
  openGraph: {
    title: "Pearl Index",
    description: "Curated skills for coding agents. Browse, install, adapt.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body className="font-ui antialiased">{children}</body>
    </html>
  );
}
