import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Layers3, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Wordmark } from "@/components/brand";
import { getSkill, relatedSkills, skills } from "@/lib/skills";

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
  };
}

export default async function SkillPage({ params }: { params: Params }) {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) notFound();
  const related = relatedSkills(skill);

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.9),rgba(217,221,229,.28)_45%,transparent_70%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-40 h-96 opacity-50" />
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/58 px-4 py-2.5 text-sm font-semibold text-[#5f6470] shadow-[0_14px_42px_rgba(30,35,45,.06)] backdrop-blur-xl transition hover:bg-white hover:text-[#111]">
          <ArrowLeft size={16} /> Catalog
        </Link>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-10 pt-8 sm:px-8 lg:grid-cols-[1fr_420px] lg:pt-16">
        <div>
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="ink-button rounded-full bg-[#111] px-3 py-1.5 text-xs font-bold text-white">{skill.category}</span>
            <span className="rounded-full border border-black/10 bg-white/58 px-3 py-1.5 text-xs font-bold text-[#5f6470]">{skill.marker}</span>
            <span className="rounded-full border border-black/10 bg-white/58 px-3 py-1.5 text-xs font-bold text-[#5f6470]">{skill.difficulty}</span>
          </div>
          <h1 className="font-display text-[clamp(4rem,9vw,8.8rem)] font-semibold leading-[0.88] tracking-normal">
            {skill.title.split(" ")[0]} <span className="chrome-text">{skill.title.split(" ").slice(1).join(" ") || "Skill"}</span>
          </h1>
          <p className="mt-8 max-w-3xl text-balance text-xl leading-8 text-[#5f6470] sm:text-2xl sm:leading-9">{skill.description}</p>
        </div>

        <aside className="pearl-panel h-fit rounded-[34px] p-5 lg:sticky lg:top-6">
          <div className="rounded-[26px] border border-black/10 bg-white/68 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8e95a3]">Curated score</p>
                <p className="mt-1 font-display text-5xl font-semibold">{skill.score}</p>
              </div>
              <div className="grid size-16 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_20%,#fff,#d9dde5_58%,#8fb7ff)] shadow-[inset_0_1px_10px_rgba(255,255,255,.9)]">
                <Sparkles size={24} />
              </div>
            </div>
            <div className="space-y-3 text-sm font-semibold text-[#5f6470]">
              <div className="flex items-center justify-between gap-4"><span>Compatibility</span><span className="text-right text-[#111]">{skill.compatibility.join(", ")}</span></div>
              <div className="flex items-center justify-between gap-4"><span>Setup</span><span className="text-right text-[#111]">{skill.setup}</span></div>
              <div className="flex items-center justify-between gap-4"><span>Source</span><span className="text-right text-[#111]">{skill.source}</span></div>
            </div>
          </div>
          <div className="mt-4 rounded-[26px] bg-[#111] p-4 text-white shadow-[0_18px_55px_rgba(17,17,17,.18)]">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/52">Install command</p>
            <code className="block overflow-x-auto whitespace-nowrap rounded-2xl bg-white/8 px-4 py-3 text-sm text-white/92">{skill.install}</code>
            <div className="mt-4"><CopyButton value={skill.install} label="Copy command" /></div>
          </div>
        </aside>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 sm:px-8 lg:grid-cols-3">
        <InfoBlock icon={<PackageCheck size={20} />} title="Examples" items={skill.examples} />
        <InfoBlock icon={<Layers3 size={20} />} title="Use cases" items={skill.useCases} />
        <div className="pearl-panel rounded-[30px] p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#8e95a3]"><ShieldCheck size={18} /> Tags</div>
          <div className="flex flex-wrap gap-2">
            {skill.tags.map((tag) => <span key={tag} className="rounded-full border border-black/10 bg-white/58 px-3 py-1.5 text-sm font-semibold text-[#5f6470]">{tag}</span>)}
          </div>
          <a href={`https://example.com/skills/${skill.slug}`} className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/62 px-4 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-white">
            Source link <ArrowUpRight size={16} />
          </a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">Related</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Nearby skills.</h2>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {related.map((item) => (
            <Link key={item.slug} href={`/skills/${item.slug}`} className="group rounded-[30px] border border-black/10 bg-white/58 p-5 shadow-[0_18px_55px_rgba(30,35,45,.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/86">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-[#f2f3f0] px-3 py-1 text-xs font-bold text-[#5f6470]">{item.category}</span>
                <ArrowUpRight size={18} className="text-[#8e95a3] transition group-hover:text-[#111]" />
              </div>
              <h3 className="font-display text-3xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#5f6470]">{item.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="pearl-panel rounded-[30px] p-6">
      <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{icon}{title}</div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-[22px] border border-black/10 bg-white/54 p-4 text-sm font-semibold leading-6 text-[#5f6470]">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#7b8392]" /> {item}
          </div>
        ))}
      </div>
    </div>
  );
}
