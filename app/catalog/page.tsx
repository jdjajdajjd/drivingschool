import type { Metadata } from "next";
import { CatalogPageExperience } from "@/components/catalog-page-experience";

export const metadata: Metadata = {
  title: "Catalog",
  description: "Search and filter practical skills for Codex, ChatGPT, Claude and AI coding agents.",
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: "Catalog — Codex Skills",
    description: "Search and filter practical skills for Codex, ChatGPT, Claude and AI coding agents.",
    url: "/catalog",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Codex Skills catalog" }],
  },
};

export default function CatalogPage() {
  return <CatalogPageExperience />;
}
