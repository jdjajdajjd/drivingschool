import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillDetailExperience } from "@/components/skill-detail-experience";
import { getSkill, skills } from "@/lib/skills";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return skills.map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) return {};
  return {
    title: skill.title,
    description: skill.summary,
    openGraph: {
      title: `${skill.title} - Codex Skills`,
      description: skill.summary,
    },
  };
}

export default async function SkillPage({ params }: { params: Params }) {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) notFound();

  return <SkillDetailExperience skill={skill} />;
}
