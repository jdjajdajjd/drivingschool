"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Send, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/brand";
import { skills, categoryLabels, skillSummary, skillTitle, type Skill } from "@/lib/skills";
import { telegramBotUrl } from "@/lib/site-config";
import { track } from "@/lib/analytics";

const smooth = [0.22, 1, 0.36, 1] as const;

const copy = {
  en: {
    nav: ["Catalog", "About", "Submit"],
    eyebrow: "Curated skills for coding agents",
    h1a: "Codex",
    h1b: "Skills",
    subtitle: "A polished shelf of practical workflows for Codex, ChatGPT, Claude, and local coding agents.",
    browse: "Browse catalog",
    telegram: "Telegram bot",
    chips: ["Browse", "Get in Telegram", "Adapt"],
    picksKicker: "Featured skills",
    picksTitle: "Useful from the first run.",
    picksText: "A small selection from the catalog. The full shelf is built for fast search and Telegram delivery.",
    catalogTitle: "Open the working catalog.",
    catalogText: "Search by use case, filter by agent compatibility, and get each skill through Telegram.",
    shelvesKicker: "Curated shelves",
    shelvesTitle: "Picked like a working library.",
    shelvesText: "Collections are grouped by real engineering moments, not directory categories.",
    shelves: [
      { title: "Editor's picks", why: "A tight starting shelf for design, testing, docs, security, and deploy work.", slugs: ["frontend-design", "webapp-testing", "openai-docs"] },
      { title: "Best for frontend polish", why: "Useful when the page works, but still needs taste, clarity, and mobile care.", slugs: ["component-audit", "accessibility-pass", "mobile-ui-qa"] },
      { title: "Power tools", why: "For moments where the agent needs more context, checks, and restraint.", slugs: ["threat-modeling", "release-risk-scan", "migration-planner"] },
    ],
  },
  ru: {
    nav: ["Каталог", "О проекте", "Отправить"],
    eyebrow: "Подборка skills для coding agents",
    h1a: "Codex",
    h1b: "Skills",
    subtitle: "Аккуратная полка практичных workflows для Codex, ChatGPT, Claude и локальных coding agents.",
    browse: "Открыть каталог",
    telegram: "Telegram bot",
    chips: ["Найти", "Получить", "Адаптировать"],
    picksKicker: "Featured skills",
    picksTitle: "Полезно с первого запуска.",
    picksText: "Небольшая выборка из каталога. Полная версия сделана для быстрого поиска и выдачи через Telegram.",
    catalogTitle: "Перейти в рабочий каталог.",
    catalogText: "Ищите по сценариям, фильтруйте по совместимости и получайте skills через Telegram.",
    shelvesKicker: "Подборки",
    shelvesTitle: "Собрано как рабочая библиотека.",
    shelvesText: "Подборки сгруппированы по реальным инженерным задачам, а не только по категориям.",
    shelves: [
      { title: "Выбор редакции", why: "Стартовая полка для дизайна, тестов, docs, security и деплоя.", slugs: ["frontend-design", "webapp-testing", "openai-docs"] },
      { title: "Frontend polish", why: "Когда страница уже работает, но ей нужны вкус, ясность и аккуратный mobile.", slugs: ["component-audit", "accessibility-pass", "mobile-ui-qa"] },
      { title: "Power tools", why: "Для задач, где агенту нужны контекст, проверки и осторожность.", slugs: ["threat-modeling", "release-risk-scan", "migration-planner"] },
    ],
  },
} as const;

export function HomeExperience() {
  const { locale, setLocale } = useLocale();
  const t = copy[locale];
  const featured = skills.filter((skill) => skill.featured).slice(0, 4);
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, -70]);

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <motion.div style={{ y: drift }} className="pointer-events-none absolute inset-x-0 top-0 h-[760px] overflow-hidden opacity-90">
        <div className="soft-ring left-[7%] top-32 h-56 w-56 animate-[float_8s_ease-in-out_infinite]" />
        <div className="pearl-orb right-[12%] top-28 h-24 w-24 opacity-70 animate-[float_9s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/2 top-6 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.86),rgba(217,221,229,.2)_42%,transparent_68%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-56 h-96 opacity-45" />
      </motion.div>

      <TopNav t={t} locale={locale} setLocale={setLocale} />

      <section className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:pt-0">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="relative z-10">
          <motion.div variants={fade} className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/62 px-4 py-2 text-sm font-semibold text-[#5f6470] shadow-[0_14px_45px_rgba(30,35,45,.06)] backdrop-blur-xl">
            <Sparkles size={15} className="text-[#7b8392]" /> {t.eyebrow}
          </motion.div>
          <motion.h1 variants={fade} className="font-display text-[clamp(4.3rem,9.5vw,9.7rem)] font-semibold leading-[0.86] tracking-normal">
            {t.h1a} <span className="chrome-text">{t.h1b}</span>
          </motion.h1>
          <motion.p variants={fade} className="mt-8 max-w-2xl text-balance text-xl leading-8 text-[#5f6470] sm:text-2xl sm:leading-9">
            {t.subtitle}
          </motion.p>
          <motion.div variants={fade} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/catalog" onClick={() => track("catalog_open", { source: "home_hero" })} className="ink-button shine-layer relative inline-flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#111] px-6 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(17,17,17,.18)] transition hover:-translate-y-0.5 hover:bg-[#23252a]">
              {t.browse} <ArrowRight size={17} />
            </Link>
            <a href={telegramBotUrl("catalog")} onClick={() => track("telegram_click", { source: "home_hero", payload: "catalog" })} className="shine-layer relative inline-flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-full border border-black/10 bg-white/62 px-6 text-sm font-semibold text-[#111] shadow-[0_16px_45px_rgba(30,35,45,.07)] transition hover:-translate-y-0.5 hover:bg-white">
              <Send size={17} /> {t.telegram}
            </a>
          </motion.div>
          <motion.div variants={fade} className="mt-7 flex flex-wrap gap-3 text-sm text-[#5f6470]">
            {t.chips.map((item) => <span key={item} className="rounded-full border border-black/10 bg-white/48 px-4 py-2 backdrop-blur-xl">{item}</span>)}
          </motion.div>
        </motion.div>

        <HeroObject featured={featured} locale={locale} />
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.picksKicker}</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{t.picksTitle}</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#5f6470]">{t.picksText}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {featured.map((skill, index) => <FeatureTile key={skill.slug} skill={skill} index={index} locale={locale} />)}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.shelvesKicker}</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{t.shelvesTitle}</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#5f6470]">{t.shelvesText}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {t.shelves.map((shelf, index) => <HomeShelf key={shelf.title} shelf={shelf} index={index} locale={locale} />)}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="pearl-surface rounded-[36px] p-8 sm:p-12">
          <div className="absolute right-8 top-8 hidden size-24 rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff,#d9dde5_42%,#8fb7ff_100%)] opacity-70 shadow-[0_20px_70px_rgba(143,183,255,.18)] md:block" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">Codex Skills</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-semibold sm:text-5xl">{t.catalogTitle}</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-[#5f6470]">{t.catalogText}</p>
          <Link href="/catalog" className="ink-button shine-layer relative mt-7 inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#111] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#23252a]">
            {t.browse} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: smooth } },
};

function TopNav({ t, locale, setLocale }: { t: typeof copy.en | typeof copy.ru; locale: "en" | "ru"; setLocale: (locale: "en" | "ru") => void }) {
  return (
    <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Wordmark />
      <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/52 px-2 py-2 shadow-[0_16px_50px_rgba(30,35,45,.06)] backdrop-blur-xl md:flex">
        {t.nav.map((item, index) => (
          <Link key={item} href={index === 0 ? "/catalog" : index === 1 ? "/about" : "/submit"} className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6470] transition hover:bg-white hover:text-[#111]">
            {item}
          </Link>
        ))}
      </div>
      <LocaleToggle locale={locale} setLocale={setLocale} />
    </nav>
  );
}

function HeroObject({ featured, locale }: { featured: Skill[]; locale: "en" | "ru" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.25, ease: smooth }} className="relative z-10 mt-14 min-h-[500px] lg:mt-0">
      <div className="absolute left-8 top-2 h-[410px] w-[410px] rounded-full bg-[conic-gradient(from_180deg,#fff,#d9dde5,#8fb7ff,#f7f7f4,#c9c2ff,#fff)] opacity-55 blur-2xl" />
      <motion.div animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="pearl-surface mx-auto max-w-[520px] rounded-[42px] p-5">
        <div className="rounded-[32px] border border-black/10 bg-[linear-gradient(145deg,rgba(255,255,255,.72),rgba(242,243,240,.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#5f6470]"><ShieldCheck size={16} /> Curated shelf</div>
            <div className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{skills.length} skills</div>
          </div>
          <div className="space-y-3">
            {featured.map((skill, index) => (
              <motion.div key={skill.slug} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + index * 0.08 }} className="shine-layer group relative overflow-hidden rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-[0_12px_36px_rgba(30,35,45,.06)] transition duration-300 hover:-translate-y-1 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold"><span className="mr-2 text-xl">{skill.emoji}</span>{skillTitle(skill, locale)}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#5f6470]">{skillSummary(skill, locale)}</p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-[#f7f7f4] px-2.5 py-1 text-xs font-bold text-[#7b8392]">{skill.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FeatureTile({ skill, index, locale }: { skill: Skill; index: number; locale: "en" | "ru" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.55 }} className="pearl-surface group rounded-[28px] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/82">
      <div className="mb-5 flex items-center justify-between">
        <span className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{skill.emoji} {categoryLabels[locale][skill.category]}</span>
        <span className="text-sm font-bold text-[#7b8392]">{skill.score}</span>
      </div>
      <h3 className="font-display text-3xl font-semibold">{skillTitle(skill, locale)}</h3>
      <p className="mt-3 text-sm leading-6 text-[#5f6470]">{skillSummary(skill, locale)}</p>
    </motion.div>
  );
}

function HomeShelf({ shelf, index, locale }: { shelf: { title: string; why: string; slugs: readonly string[] }; index: number; locale: "en" | "ru" }) {
  const shelfSkills = shelf.slugs.map((slug) => skills.find((skill) => skill.slug === slug)).filter(Boolean) as Skill[];

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.55, ease: smooth }} className="pearl-surface rounded-[30px] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/82">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{locale === "en" ? "Why this collection" : "Почему эта подборка"}</p>
      <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#111]">{shelf.title}</h3>
      <p className="mt-3 text-sm font-medium leading-6 text-[#5f6470]">{shelf.why}</p>
      <div className="mt-5 grid gap-2">
        {shelfSkills.map((skill) => (
          <Link key={skill.slug} href={`/skills/${skill.slug}`} onClick={() => track("skill_open", { slug: skill.slug, source: "home_shelf" })} className="flex items-center justify-between gap-3 rounded-[18px] border border-black/10 bg-white/48 px-3 py-2.5 transition hover:bg-white">
            <span className="min-w-0 truncate text-sm font-semibold text-[#111]"><span className="mr-2">{skill.emoji}</span>{skillTitle(skill, locale)}</span>
            <ArrowRight size={15} className="shrink-0 text-[#8e95a3]" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
