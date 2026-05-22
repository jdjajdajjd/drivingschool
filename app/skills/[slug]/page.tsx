import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillDetailExperience } from "@/components/skill-detail-experience";
import { getSkill, skills } from "@/lib/skills";
import { siteConfig } from "@/lib/site-config";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return skills.map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) return {};
  const title = `${skill.title} skill`;
  const description = `${skill.summary} Compatible with ${skill.compatibility.join(", ")}.`;
  const url = `/skills/${skill.slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${skill.title} skill — Codex Skills`,
      description,
      url,
      siteName: "Codex Skills",
      type: "article",
      images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: `${skill.title} — Codex Skills` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${skill.title} skill — Codex Skills`,
      description,
      images: [`${siteConfig.url}/og-image.svg`],
    },
  };
}

export default async function SkillPage({ params }: { params: Params }) {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) notFound();

  return <SkillDetailExperience skill={skill} />;
}
