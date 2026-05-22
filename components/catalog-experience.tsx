"use client";

import { AnimatePresence, motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, Command, ExternalLink, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, skills, type Category, type Skill } from "@/lib/skills";
import { categoryLabels, skillSummary, skillTags, skillTitle } from "@/lib/skills";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { Wordmark } from "@/components/brand";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { SiteFooter } from "@/components/site-footer";

const all = "All";

const smooth = [0.22, 1, 0.36, 1] as const;

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: smooth } },
};

const copy = {
  en: {
    nav: ["Catalog", "About", "Submit"],
    eyebrow: "Curated skills for coding agents",
    h1a: "Codex",
    h1b: "Skills",
    subtitle: "A polished catalog of practical agent workflows. Browse, install, adapt.",
    search: "Search skills, sources, workflows...",
    cta: "Browse skills",
    telegram: "Telegram bot",
    chips: ["Clean tools", "Useful workflows", "Agent-ready"],
    picksKicker: "Editor picks",
    picksTitle: "Useful from the first run.",
    picksText: "A short shelf of skills that make agent work cleaner without adding ceremony.",
    catalogKicker: "Catalog",
    catalogTitle: "Browse the shelf.",
    filter: "Filter instantly",
    empty: "No matches. Try a source, category, or workflow name.",
    submitKicker: "Submit",
    submitTitle: "A clean place for useful workflows.",
    submitText: "Codex Skills favors skills that are clear, practical, easy to inspect, and calm in daily use.",
    submitCopy: "Copy submit command",
    submitPage: "Submit Skill",
    source: "Source link",
    shelf: "Curated shelf",
    skills: "skills",
    brandLine: "Brand line",
    brandCopy: "Clean tools, useful workflows.",
    compatibility: "Compatibility",
    setup: "Setup",
    sourceLabel: "Source",
    open: "Open",
    copy: "Copy",
    telegramKicker: "Telegram",
    telegramTitle: "Follow updates in the bot.",
    telegramText: "Get catalog updates, send skill ideas, or keep a quick install note close by.",
    telegramOpen: "Open Telegram bot",
  },
  ru: {
    nav: ["Каталог", "О проекте", "Отправить"],
    eyebrow: "Подобранные skills для coding agents",
    h1a: "Codex",
    h1b: "Skills",
    subtitle: "Красивый каталог практичных agent workflows. Найти, установить, адаптировать.",
    search: "Искать skills, источники, workflows...",
    cta: "Смотреть skills",
    telegram: "Telegram bot",
    chips: ["Чистые инструменты", "Полезные workflows", "Готово для агентов"],
    picksKicker: "Выбор редакции",
    picksTitle: "Полезно с первого запуска.",
    picksText: "Короткая полка skills, которые делают работу агента чище без лишней церемонии.",
    catalogKicker: "Каталог",
    catalogTitle: "Просмотр коллекции.",
    filter: "Фильтр мгновенно",
    empty: "Ничего не найдено. Попробуй источник, категорию или workflow.",
    submitKicker: "Отправить",
    submitTitle: "Чистое место для полезных workflows.",
    submitText: "Codex Skills выбирает skills, которые понятны, практичны, легко проверяются и спокойны в ежедневной работе.",
    submitCopy: "Скопировать команду",
    submitPage: "Отправить skill",
    source: "Источник",
    shelf: "Подборка",
    skills: "skills",
    brandLine: "Фраза бренда",
    brandCopy: "Чистые инструменты, полезные workflows.",
    compatibility: "Совместимость",
    setup: "Настройка",
    sourceLabel: "Источник",
    open: "Открыть",
    copy: "Копировать",
    telegramKicker: "Telegram",
    telegramTitle: "Следить за обновлениями в боте.",
    telegramText: "Получай обновления каталога, отправляй идеи skills или держи быстрые команды рядом.",
    telegramOpen: "Открыть Telegram bot",
  },
} as const;

export function CatalogExperience() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Category | typeof all>(all);
  const { locale, setLocale } = useLocale();
  const t = copy[locale];
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, -85]);
  const glow = useTransform(scrollYProgress, [0, 0.55, 1], [1, 0.62, 0.42]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((skill) => {
      const categoryMatch = active === all || skill.category === active;
      const textMatch = !q || [skill.title, skill.summary, skill.ru.title, skill.ru.summary, skill.category, skill.source, ...skill.tags, ...skill.ru.tags, ...skill.compatibility]
        .join(" ")
        .toLowerCase()
        .includes(q);
      return categoryMatch && textMatch;
    });
  }, [query, active]);

  const featured = skills.filter((skill) => skill.score >= 90).slice(0, 4);
  const updateQuery = (event: React.FormEvent<HTMLInputElement>) => setQuery(event.currentTarget.value);

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      <motion.div style={{ y: drift, opacity: glow }} className="pointer-events-none absolute inset-x-0 top-0 h-[780px] overflow-hidden">
        <div className="soft-ring left-[7%] top-32 h-56 w-56 animate-[float_8s_ease-in-out_infinite]" />
        <div className="soft-ring right-[8%] top-24 h-28 w-28 animate-[float_9s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/2 top-6 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.86),rgba(217,221,229,.2)_42%,transparent_68%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-56 h-96 opacity-50" />
      </motion.div>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/52 px-2 py-2 shadow-[0_16px_50px_rgba(30,35,45,.06)] backdrop-blur-xl md:flex">
          {t.nav.map((item, index) => (
            <Link key={item} href={index === 0 ? '/#catalog' : index === 1 ? '/about' : '/submit'} className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6470] transition hover:bg-white hover:text-[#111]">
              {item}
            </Link>
          ))}
        </div>
        <LocaleToggle locale={locale} setLocale={setLocale} />
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-12 lg:pt-0">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.11 } } }} className="relative z-10">
          <motion.div variants={fade} className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/62 px-4 py-2 text-sm font-semibold text-[#5f6470] shadow-[0_14px_45px_rgba(30,35,45,.06)] backdrop-blur-xl">
            <Sparkles size={15} className="text-[#7b8392]" /> {t.eyebrow}
          </motion.div>
          <motion.h1 variants={fade} className="font-display text-[clamp(4.3rem,9.5vw,9.7rem)] font-semibold leading-[0.86] tracking-normal">
            {t.h1a} <span className="chrome-text">{t.h1b}</span>
          </motion.h1>
          <motion.p variants={fade} className="mt-8 max-w-2xl text-balance text-xl leading-8 text-[#5f6470] sm:text-2xl sm:leading-9">
            {t.subtitle}
          </motion.p>

          <motion.div variants={fade} className="codex-panel mt-10 max-w-3xl rounded-[32px] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex min-h-16 flex-1 items-center rounded-[24px] bg-white/72 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,.85)]">
                <Search size={22} className="mr-3 text-[#8e95a3]" />
                <input
                  value={query}
                  onChange={updateQuery}
                  onInput={updateQuery}
                  onKeyUp={updateQuery}
                  placeholder={t.search}
                  className="w-full bg-transparent text-base font-medium text-[#111] outline-none placeholder:text-[#8e95a3] sm:text-lg"
                />
                <span className="hidden items-center gap-1 rounded-full border border-black/10 bg-[#f7f7f4] px-2.5 py-1 text-xs font-semibold text-[#8e95a3] sm:flex">
                  <Command size={12} /> K
                </span>
              </label>
              <a href="#catalog" className="ink-button inline-flex min-h-16 items-center justify-center gap-2 rounded-[24px] bg-[#111] px-6 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(17,17,17,.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#23252a] focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50">
                {t.cta} <ArrowRight size={17} />
              </a>
              <a href="https://t.me/vroomleadsbot" className="inline-flex min-h-16 items-center justify-center gap-2 rounded-[24px] border border-black/10 bg-white/62 px-6 text-sm font-semibold text-[#111] shadow-[0_16px_45px_rgba(30,35,45,.07)] transition duration-300 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50 sm:min-w-40">
                <Send size={17} /> {t.telegram}
              </a>
            </div>
          </motion.div>

          <motion.div variants={fade} className="mt-7 flex flex-wrap gap-3 text-sm text-[#5f6470]">
            {t.chips.map((item) => (
              <span key={item} className="rounded-full border border-black/10 bg-white/48 px-4 py-2 backdrop-blur-xl">{item}</span>
            ))}
          </motion.div>
        </motion.div>

        <HeroObject featured={featured} locale={locale} t={t} />
      </section>

      <section id="picks" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-7 flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.picksKicker}</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{t.picksTitle}</h2>
          </div>
          <p className="hidden max-w-sm text-sm leading-6 text-[#5f6470] md:block">{t.picksText}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {featured.map((skill, index) => <FeatureTile key={skill.slug} skill={skill} index={index} locale={locale} />)}
        </div>
      </section>

      <section id="catalog" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
        <div className="codex-panel overflow-hidden rounded-[36px] p-4 sm:p-6 lg:p-8">
          <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]"><SlidersHorizontal size={15} /> {t.catalogKicker}</div>
              <h2 className="font-display text-4xl font-semibold sm:text-5xl">{t.catalogTitle}</h2>
            </div>
            <div className="relative max-w-xl flex-1 rounded-full border border-black/10 bg-white/68 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8e95a3]" size={18} />
              <input value={query} onChange={updateQuery} onInput={updateQuery} onKeyUp={updateQuery} className="w-full bg-transparent pl-8 text-sm font-semibold outline-none placeholder:text-[#8e95a3]" placeholder={t.filter} />
            </div>
          </div>

          <div className="scrollbar-hide -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-2">
            {([all, ...categories] as Array<Category | typeof all>).map((category) => {
              const selected = active === category;
              return (
                <button key={category} onClick={() => setActive(category as Category | typeof all)} className={cn("relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50", selected ? "ink-button text-white" : "border border-black/10 bg-white/58 text-[#5f6470] hover:bg-white hover:text-[#111]") }>
                  {selected && <motion.span layoutId="active-pill" className="absolute inset-0 rounded-full bg-[#111] shadow-[0_14px_36px_rgba(17,17,17,.16)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative">{categoryLabels[locale][category]}</span>
                </button>
              );
            })}
          </div>

          <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((skill, index) => <SkillCard key={skill.slug} skill={skill} index={index} locale={locale} t={t} />)}
            </AnimatePresence>
          </motion.div>
          {filtered.length === 0 && <div className="rounded-[28px] border border-dashed border-black/10 bg-white/54 p-10 text-center text-[#5f6470]">{t.empty}</div>}
        </div>
      </section>

      <section id="submit" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="codex-panel copy-grid relative overflow-hidden rounded-[36px] p-8 sm:p-12">
          <div className="absolute right-8 top-8 hidden size-28 rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff,#d9dde5_42%,#8fb7ff_100%)] opacity-70 shadow-[0_20px_70px_rgba(143,183,255,.22)] md:block" />
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.submitKicker}</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{t.submitTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-[#5f6470]">{t.submitText}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <CopyButton value="codex skills submit ./my-skill" label={t.submitCopy} />
              <Link href="/submit" className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/56 px-4 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-white">
                {t.submitPage} <ArrowRight size={15} />
              </Link>
              <a href="mailto:submit@codexskills.dev" className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/56 px-4 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-white">
                {t.source} <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="codex-panel relative overflow-hidden rounded-[36px] p-8 sm:p-12">
          <div className="absolute right-8 top-8 hidden size-24 rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff,#d9dde5_42%,#c9c2ff_100%)] opacity-70 shadow-[0_20px_70px_rgba(143,183,255,.18)] md:block" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.telegramKicker}</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-semibold sm:text-5xl">{t.telegramTitle}</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-[#5f6470]">{t.telegramText}</p>
          <a href="https://t.me/vroomleadsbot" className="ink-button mt-7 inline-flex items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#23252a]">
            <Send size={16} /> {t.telegramOpen}
          </a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function HeroObject({ featured, locale, t }: { featured: Skill[]; locale: "en" | "ru"; t: typeof copy.en | typeof copy.ru }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.25, ease: smooth }} className="relative z-10 mt-16 min-h-[520px] lg:mt-0">
      <div className="absolute left-8 top-2 h-[410px] w-[410px] rounded-full bg-[conic-gradient(from_180deg,#fff,#d9dde5,#8fb7ff,#f7f7f4,#c9c2ff,#fff)] opacity-60 blur-2xl" />
      <motion.div animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="codex-panel relative mx-auto max-w-[520px] rounded-[42px] p-5">
        <div className="rounded-[32px] border border-black/10 bg-[linear-gradient(145deg,rgba(255,255,255,.72),rgba(242,243,240,.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#5f6470]"><ShieldCheck size={16} /> {t.shelf}</div>
            <div className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{skills.length} {t.skills}</div>
          </div>
          <div className="space-y-3">
            {featured.map((skill, index) => (
              <motion.div key={skill.slug} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + index * 0.08 }} className="group rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-[0_12px_36px_rgba(30,35,45,.06)] transition duration-300 hover:-translate-y-1 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold">{skillTitle(skill, locale)}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#5f6470]">{skillSummary(skill, locale)}</p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-[#f7f7f4] px-2.5 py-1 text-xs font-bold text-[#7b8392]">{skill.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
      <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="codex-panel absolute bottom-8 left-0 hidden rounded-[28px] p-4 lg:block">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e95a3]">{t.brandLine}</div>
        <div className="mt-1 font-display text-2xl font-semibold">{t.brandCopy}</div>
      </motion.div>
    </motion.div>
  );
}

function FeatureTile({ skill, index, locale }: { skill: Skill; index: number; locale: "en" | "ru" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.06, duration: 0.55 }} className="group rounded-[28px] border border-black/10 bg-white/58 p-5 shadow-[0_18px_55px_rgba(30,35,45,.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/82">
      <div className="mb-5 flex items-center justify-between">
        <span className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{categoryLabels[locale][skill.category]}</span>
        <span className="text-sm font-bold text-[#7b8392]">{skill.score}</span>
      </div>
      <h3 className="font-display text-3xl font-semibold">{skillTitle(skill, locale)}</h3>
      <p className="mt-3 text-sm leading-6 text-[#5f6470]">{skillSummary(skill, locale)}</p>
    </motion.div>
  );
}

function SkillCard({ skill, index, locale, t }: { skill: Skill; index: number; locale: "en" | "ru"; t: typeof copy.en | typeof copy.ru }) {
  return (
    <motion.article layout initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.34, delay: Math.min(index * 0.025, 0.18) }} whileHover={{ y: -6, rotateX: 1.5, rotateY: -1.5 }} className="group rounded-[30px] border border-black/10 bg-white/62 p-5 shadow-[0_20px_60px_rgba(30,35,45,.07)] backdrop-blur-xl transition-colors duration-300 hover:bg-white/86">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f2f3f0] px-3 py-1 text-xs font-bold text-[#5f6470]">{categoryLabels[locale][skill.category]}</span>
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-bold text-[#7b8392]">{skill.marker}</span>
          </div>
          <h3 className="font-display text-3xl font-semibold tracking-normal">{skillTitle(skill, locale)}</h3>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_20%,#fff,#d9dde5_58%,#b8c0cc)] text-sm font-black text-[#111] shadow-[inset_0_1px_8px_rgba(255,255,255,.82)]">{skill.score}</div>
      </div>
      <p className="min-h-14 text-sm leading-6 text-[#5f6470]">{skillSummary(skill, locale)}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {skillTags(skill, locale).map((tag) => <span key={tag} className="rounded-full border border-black/10 bg-white/42 px-3 py-1 text-xs font-semibold text-[#5f6470]">{tag}</span>)}
      </div>
      <div className="mt-6 grid gap-2 rounded-[22px] border border-black/10 bg-[#f7f7f4]/62 p-3 text-xs font-semibold text-[#5f6470]">
        <div className="flex items-center justify-between gap-3"><span>{t.compatibility}</span><span className="text-right text-[#111]">{skill.compatibility.join(", ")}</span></div>
        <div className="flex items-center justify-between gap-3"><span>{t.setup}</span><span className="text-right text-[#111]">{skill.setup}</span></div>
        <div className="flex items-center justify-between gap-3"><span>{t.sourceLabel}</span><span className="text-right text-[#111]">{skill.source}</span></div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <Link href={`/skills/${skill.slug}`} className="ink-button inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#23252a]">
          {t.open} <ArrowRight size={15} />
        </Link>
        <CopyButton value={skill.install} label={t.copy} />
      </div>
    </motion.article>
  );
}
