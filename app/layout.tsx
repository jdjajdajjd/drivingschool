import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
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
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Codex Skills — Curated skills for coding agents",
    template: "%s — Codex Skills",
  },
  description: "Browse practical skills for Codex, ChatGPT, Claude and AI coding agents.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Codex Skills — Curated skills for coding agents",
    description: "Browse practical skills for Codex, ChatGPT, Claude and AI coding agents.",
    url: "/",
    siteName: "Codex Skills",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Codex Skills" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codex Skills — Curated skills for coding agents",
    description: "Browse practical skills for Codex, ChatGPT, Claude and AI coding agents.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body className="font-ui antialiased">{children}</body>
    </html>
  );
}
