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
    default: "Codex Skills - Curated skills for coding agents",
    template: "%s - Codex Skills",
  },
  description: "A polished catalog of practical skills for Codex, ChatGPT, Claude, and AI coding agents.",
  metadataBase: new URL("https://drivingschool-6wy.pages.dev"),
  openGraph: {
    title: "Codex Skills",
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
