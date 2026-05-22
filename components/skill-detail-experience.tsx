"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, FileText, FolderGit2, PackageCheck, Send, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { categoryLabels, difficultyLabels, relatedSkills, riskLabels, skillDescription, skillExamples, skillSummary, skillTags, skillTitle, skillUseCases, type Locale, type Risk, type Skill } from "@/lib/skills";
import { telegramSkillUrl } from "@/lib/site-config";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

const smooth = [0.22, 1, 0.36, 1] as const;

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: smooth } },
};

const detailCopy = {
  en: {
    catalog: "Catalog",
    score: "Curated score",
    compatibility: "Compatibility",
    difficulty: "Difficulty",
    risk: "Risk",
    get: "Get skill via Telegram",
    deliveryNote: "The bot sends the skill, install command, source link, and short instructions.",
    helps: "What it helps with",
    useCases: "Use cases",
    contents: "Skill contents",
    safety: "Safety / risk notes",
    source: "Source",
    sourceUnavailable: "Public source link is not listed for this catalog item yet.",
    related: "Similar skills",
    relatedTitle: "Nearby shelf.",
    skillMd: "SKILL.md",
    scripts: "Scripts",
    references: "References",
    assets: "Assets",
    included: "Included",
    notListed: "Not listed",
    checkBefore: "Check before using",
  },
  ru: {
    catalog: "Каталог",
    score: "Оценка",
    compatibility: "Совместимость",
    difficulty: "Сложность",
    risk: "Риск",
    get: "Получить в Telegram",
    deliveryNote: "Бот отправит skill, команду установки, источник и короткую инструкцию.",
    helps: "С чем помогает",
    useCases: "Сценарии",
    contents: "Состав skill",
    safety: "Риски и проверки",
    source: "Источник",
    sourceUnavailable: "Публичная ссылка на источник пока не указана для этой карточки.",
    related: "Похожие skills",
    relatedTitle: "Близкая полка.",
    skillMd: "SKILL.md",
    scripts: "Scripts",
    references: "References",
    assets: "Assets",
    included: "Есть",
    notListed: "Не указано",
    checkBefore: "Проверить перед использованием",
  },
} as const;

const riskNotes: Record<Locale, Record<Risk, string[]>> = {
  en: {
    Low: ["Read the SKILL.md trigger rules.", "Check generated edits before applying them broadly.", "Keep credentials out of prompts and examples."],
    Medium: ["Review commands before execution.", "Run on a branch or disposable workspace first.", "Check file changes and external calls before shipping."],
    High: ["Confirm credentials and deployment targets.", "Run dry checks before publishing.", "Review generated scripts, permissions, and rollback path."],
  },
  ru: {
    Low: ["Проверь triggers в SKILL.md.", "Смотри generated edits перед широким применением.", "Не вставляй credentials в prompts и examples."],
    Medium: ["Проверь команды перед запуском.", "Сначала запускай в branch или disposable workspace.", "Проверь file changes и внешние вызовы перед релизом."],
    High: ["Проверь credentials и deployment targets.", "Сначала сделай dry checks.", "Проверь scripts, permissions и rollback path."],
  },
};

export function SkillDetailExperience({ skill }: { skill: Skill }) {
  const { locale, setLocale } = useLocale();
  const t = detailCopy[locale];
  const related = relatedSkills(skill).slice(0, 6);
  const hasReferences = skill.hasReferences;
  const hasAssets = skill.hasAssets;

  useEffect(() => {
    track("page_view", { page: "skill", slug: skill.slug });
    track("skill_open", { slug: skill.slug, source: "page_view" });
  }, [skill.slug]);

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.92),rgba(217,221,229,.3)_45%,transparent_72%)] blur-3xl" />
        <div className="soft-ring right-[11%] top-24 h-28 w-28 animate-[float_8s_ease-in-out_infinite]" />
        <div className="pearl-orb left-[8%] top-56 h-20 w-20 opacity-65 animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="contour-lines absolute inset-x-0 top-44 h-96 opacity-50" />
        <div className="contour-fine absolute right-0 top-[520px] h-60 w-[620px] opacity-30" />
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          <LocaleToggle locale={locale} setLocale={setLocale} />
          <Link href="/catalog" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/58 px-4 py-2.5 text-sm font-semibold text-[#5f6470] shadow-[0_14px_42px_rgba(30,35,45,.06)] backdrop-blur-xl transition hover:bg-white hover:text-[#111]">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">{t.catalog}</span>
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-10 pt-8 sm:px-8 lg:grid-cols-[1fr_420px] lg:pt-14">
        <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: smooth }} className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Pill dark>{categoryLabels[locale][skill.category]}</Pill>
            {skill.compatibility.map((item) => <Pill key={item}>{item}</Pill>)}
          </div>
          <h1 className="flex items-start gap-3 font-display text-[clamp(2.8rem,6.6vw,6.6rem)] font-semibold leading-[0.92] tracking-normal sm:gap-4">
            <span aria-hidden="true" className="mt-1 shrink-0 text-[clamp(2.1rem,4.8vw,4.9rem)] leading-none">{skill.emoji}</span>
            <span>{skillTitle(skill, locale)}</span>
          </h1>
          <p className="mt-6 max-w-3xl text-balance text-lg leading-8 text-[#5f6470] sm:text-xl sm:leading-9">{skillSummary(skill, locale)}</p>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#5f6470]">{skillDescription(skill, locale)}</p>
          <div className="mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
            <Metric label={t.score} value={String(skill.score)} />
            <Metric label={t.difficulty} value={difficultyLabels[locale][skill.difficulty]} />
            <Metric label={t.risk} value={riskLabels[locale][skill.risk]} />
          </div>
        </motion.header>

        <motion.aside initial={{ opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.75, delay: 0.08, ease: smooth }} className="pearl-surface h-fit rounded-[34px] p-5 lg:sticky lg:top-6">
          <div className="rounded-[26px] border border-black/10 bg-white/68 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{t.get}</p>
            <p className="mt-2 text-2xl font-semibold leading-tight">{skillTitle(skill, locale)}</p>
              </div>
              <div className="grid size-14 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_20%,#fff,#d9dde5_58%,#8fb7ff)] text-2xl shadow-[inset_0_1px_10px_rgba(255,255,255,.9)]">{skill.emoji}</div>
            </div>
            <div className="grid gap-2">
              <motion.a whileTap={{ scale: 0.985 }} href={telegramSkillUrl(skill.slug)} onClick={() => track("telegram_click", { source: "skill_detail", slug: skill.slug })} aria-label={`${t.get}: ${skillTitle(skill, locale)}`} className="ink-button shine-layer relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#111] px-5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(17,17,17,.18)] transition hover:bg-[#23252a]">
                <Send size={16} /> {t.get}
              </motion.a>
            </div>
          </div>
          <p className="mt-4 rounded-[24px] border border-black/10 bg-white/54 p-4 text-sm font-semibold leading-6 text-[#5f6470]">{t.deliveryNote}</p>
        </motion.aside>
      </section>

      <motion.section initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_1fr_.9fr]">
        <InfoBlock icon={<PackageCheck size={20} />} title={t.helps} items={skillExamples(skill, locale).slice(0, 5)} />
        <InfoBlock icon={<CheckCircle2 size={20} />} title={t.useCases} items={skillUseCases(skill, locale).slice(0, 5)} />
        <motion.div variants={fadeIn} className="pearl-surface rounded-[30px] p-6">
          <SectionTitle icon={<FileText size={18} />} title={t.contents} />
          <div className="space-y-2">
            <ContentRow label={t.skillMd} included includedLabel={t.included} missingLabel={t.notListed} />
            <ContentRow label={t.scripts} included={skill.hasScripts} includedLabel={t.included} missingLabel={t.notListed} />
            <ContentRow label={t.references} included={hasReferences} includedLabel={t.included} missingLabel={t.notListed} />
            <ContentRow label={t.assets} included={hasAssets} includedLabel={t.included} missingLabel={t.notListed} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {skillTags(skill, locale).map((tag) => <span key={tag} className="rounded-full border border-black/10 bg-white/58 px-3 py-1.5 text-sm font-semibold text-[#5f6470]">{tag}</span>)}
          </div>
        </motion.div>
      </motion.section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
        <div className="pearl-surface rounded-[30px] p-6">
          <SectionTitle icon={<ShieldCheck size={18} />} title={t.safety} />
          <div className="mb-5 flex flex-wrap gap-2">
            <Pill dark>{riskLabels[locale][skill.risk]}</Pill>
            <Pill>{skill.hasScripts ? t.scripts : t.skillMd}</Pill>
          </div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{t.checkBefore}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {riskNotes[locale][skill.risk].map((item) => <Note key={item}>{item}</Note>)}
          </div>
        </div>

        <div className="pearl-surface rounded-[30px] p-6">
          <SectionTitle icon={<FolderGit2 size={18} />} title={t.source} />
          <div className="rounded-[24px] border border-black/10 bg-white/58 p-5">
            <p className="text-2xl font-semibold">{skill.source}</p>
            {skill.sourceUrl ? (
              <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/72 px-4 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-white">
                {t.source} <ArrowUpRight size={16} />
              </a>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#5f6470]">{t.sourceUnavailable}</p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.related}</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{t.relatedTitle}</h2>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {related.map((item) => (
            <Link key={item.slug} href={`/skills/${item.slug}`} onClick={() => track("skill_open", { slug: item.slug, source: "related" })} className="pearl-surface group rounded-[30px] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/86">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-2xl font-semibold leading-tight"><span className="mr-2 text-xl">{item.emoji}</span>{skillTitle(item, locale)}</h3>
                <ArrowRight size={18} className="mt-1 shrink-0 text-[#8e95a3] transition group-hover:text-[#111]" />
              </div>
              <p className="line-clamp-2 text-sm leading-6 text-[#5f6470]">{skillSummary(item, locale)}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Pill({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={dark ? "ink-button rounded-full bg-[#111] px-3 py-1.5 text-xs font-bold text-white" : "rounded-full border border-black/10 bg-white/58 px-3 py-1.5 text-xs font-bold text-[#5f6470]"}>{children}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[24px] border border-black/10 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{icon}{title}</div>;
}

function InfoBlock({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return <motion.div variants={fadeIn} className="pearl-surface rounded-[30px] p-6"><SectionTitle icon={icon} title={title} /><div className="space-y-3">{items.map((item) => <Note key={item}>{item}</Note>)}</div></motion.div>;
}

function Note({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 rounded-[22px] border border-black/10 bg-white/54 p-4 text-sm font-semibold leading-6 text-[#5f6470]"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#7b8392]" /> {children}</div>;
}

function ContentRow({ label, included, includedLabel, missingLabel }: { label: string; included: boolean; includedLabel: string; missingLabel: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-[20px] border border-black/10 bg-white/54 px-4 py-3 text-sm font-bold"><span className="text-[#5f6470]">{label}</span><span className={included ? "text-[#111]" : "text-[#8e95a3]"}>{included ? includedLabel : missingLabel}</span></div>;
}
