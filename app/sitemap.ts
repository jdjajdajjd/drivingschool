import type { MetadataRoute } from "next";
import { skills } from "@/lib/skills";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

const staticPages = ["", "catalog", "about", "submit", "privacy", "terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const safeDate = (value: string) => {
    const date = new Date(value);
    return date > now ? now : date;
  };
  return [
    ...staticPages.map((path) => ({
      url: `${siteConfig.url}${path ? `/${path}` : ""}`,
      lastModified: now,
      changeFrequency: path ? "monthly" as const : "weekly" as const,
      priority: path ? 0.6 : 1,
    })),
    ...skills.map((skill) => ({
      url: `${siteConfig.url}/skills/${skill.slug}`,
      lastModified: safeDate(skill.createdAt),
      changeFrequency: "monthly" as const,
      priority: skill.featured ? 0.9 : 0.75,
    })),
  ];
}
