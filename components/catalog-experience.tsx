"use client";

import { AnimatePresence, motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, Check, Command, ExternalLink, RotateCcw, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { categories, compatibilityOptions, difficultyOptions, riskOptions, skills, type Category, type Compatibility, type Difficulty, type Risk, type Skill } from "@/lib/skills";
import { categoryLabels, difficultyLabels, riskLabels, skillSummary, skillTags, skillTitle } from "@/lib/skills";
import { cn } from "@/lib/utils";
import { telegramBotUrl, telegramSkillUrl } from "@/lib/site-config";
import { CopyButton } from "@/components/copy-button";
import { Wordmark } from "@/components/brand";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { SiteFooter } from "@/components/site-footer";

const all = "All";
const any = "Any";
const yesNoAll = "All";
type SortKey = "Featured" | "Newest" | "Popular" | "Name" | "Score";
type HasScriptsFilter = typeof yesNoAll | "Yes" | "No";

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
    search: "Search title, use case, tag, agent...",
    cta: "Browse skills",
    telegram: "Telegram bot",
    chips: ["Clean tools", "Useful workflows", "Agent-ready"],
    picksKicker: "Editor picks",
    picksTitle: "Useful from the first run.",
    picksText: "A short shelf of skills that make agent work cleaner without adding ceremony.",
    catalogKicker: "Catalog",
    catalogTitle: "Browse the shelf.",
    filter: "Search inside catalog",
    filters: "Filters",
    sort: "Sort",
    compatible: "Compatible with",
    difficulty: "Difficulty",
    risk: "Risk",
    scripts: "Has scripts",
    freeOnly: "Free only",
    yes: "Yes",
    no: "No",
    any: "Any",
    reset: "Reset filters",
    countLabel: "Showing",
    empty: "No matches for this set.",
    emptyText: "Clear filters or try a simpler search term.",
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
    open: "Details",
    getTelegram: "Get via Telegram",
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
    search: "Искать title, use case, tag, agent...",
    cta: "Смотреть skills",
    telegram: "Telegram bot",
    chips: ["Чистые инструменты", "Полезные workflows", "Готово для агентов"],
    picksKicker: "Выбор редакции",
    picksTitle: "Полезно с первого запуска.",
    picksText: "Короткая полка skills, которые делают работу агента чище без лишней церемонии.",
    catalogKicker: "Каталог",
    catalogTitle: "Просмотр коллекции.",
    filter: "Поиск внутри каталога",
    filters: "Фильтры",
    sort: "Сортировка",
    compatible: "Совместимость",
    difficulty: "Сложность",
    risk: "Риск",
    scripts: "Есть scripts",
    freeOnly: "Только бесплатно",
    yes: "Да",
    no: "Нет",
    any: "Любые",
    reset: "Сбросить фильтры",
    countLabel: "Показано",
    empty: "Ничего не найдено для этих фильтров.",
    emptyText: "Сбрось фильтры или попробуй более простой запрос.",
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
    open: "Подробнее",
    getTelegram: "Получить в Telegram",
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
  const [compatible, setCompatible] = useState<Compatibility | typeof any>(any);
  const [difficulty, setDifficulty] = useState<Difficulty | typeof any>(any);
  const [risk, setRisk] = useState<Risk | typeof any>(any);
  const [hasScripts, setHasScripts] = useState<HasScriptsFilter>(yesNoAll);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("Featured");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const { locale, setLocale } = useLocale();
  const t = copy[locale];
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, -85]);
  const glow = useTransform(scrollYProgress, [0, 0.55, 1], [1, 0.62, 0.42]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoadingPreview(false), 360);
    return () => window.clearTimeout(timeout);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = skills.filter((skill) => {
      const categoryMatch = active === all || skill.category === active;
      const compatibilityMatch = compatible === any || skill.compatibility.includes(compatible);
      const difficultyMatch = difficulty === any || skill.difficulty === difficulty;
      const riskMatch = risk === any || skill.risk === risk;
      const scriptsMatch = hasScripts === yesNoAll || skill.hasScripts === (hasScripts === "Yes");
      const freeMatch = !freeOnly || skill.free;
      const searchable = [
        skill.title,
        skill.summary,
        skill.description,
        skill.longDescription,
        skill.id,
        skill.telegramPayload,
        skill.installCommand,
        skill.ru.title,
        skill.ru.summary,
        skill.ru.description,
        skill.category,
        categoryLabels.en[skill.category],
        categoryLabels.ru[skill.category],
        skill.source,
        skill.difficulty,
        skill.risk,
        ...skill.tags,
        ...skill.ru.tags,
        ...skill.compatibility,
        ...skill.useCases,
        ...skill.ru.useCases,
        ...skill.examples,
        ...skill.ru.examples,
        ...skill.safetyNotes,
      ].join(" ").toLowerCase();
      const textMatch = !q || searchable.includes(q);
      return categoryMatch && compatibilityMatch && difficultyMatch && riskMatch && scriptsMatch && freeMatch && textMatch;
    });
    return [...result].sort((a, b) => {
      if (sort === "Featured") return Number(b.featured) - Number(a.featured) || b.score - a.score;
      if (sort === "Newest") return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      if (sort === "Popular") return b.popularity - a.popularity;
      if (sort === "Name") return skillTitle(a, locale).localeCompare(skillTitle(b, locale));
      return b.score - a.score;
    });
  }, [query, active, compatible, difficulty, risk, hasScripts, freeOnly, sort, locale]);

  const featured = skills.filter((skill) => skill.featured).slice(0, 4);
  const updateQuery = (event: React.FormEvent<HTMLInputElement>) => setQuery(event.currentTarget.value);
  const hasActiveFilters = query.trim() !== "" || active !== all || compatible !== any || difficulty !== any || risk !== any || hasScripts !== yesNoAll || freeOnly;
  const resetFilters = () => {
    setQuery("");
    setActive(all);
    setCompatible(any);
    setDifficulty(any);
    setRisk(any);
    setHasScripts(yesNoAll);
    setFreeOnly(false);
    setSort("Featured");
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      <motion.div style={{ y: drift, opacity: glow }} className="pointer-events-none absolute inset-x-0 top-0 h-[780px] overflow-hidden">
        <div className="soft-ring left-[7%] top-32 h-56 w-56 animate-[float_8s_ease-in-out_infinite]" />
        <div className="soft-ring right-[8%] top-24 h-28 w-28 animate-[float_9s_ease-in-out_infinite_reverse]" />
        <div className="pearl-orb left-[18%] top-[440px] h-24 w-24 opacity-70 animate-[float_10s_ease-in-out_infinite]" />
        <div className="pearl-orb right-[18%] top-[390px] h-16 w-16 opacity-60 animate-[float_11s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/2 top-6 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.86),rgba(217,221,229,.2)_42%,transparent_68%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-56 h-96 opacity-50" />
        <div className="contour-fine absolute -right-24 top-[520px] h-64 w-[640px] opacity-35" />
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

          <motion.div variants={fade} className="spotlight-panel mt-10 max-w-3xl rounded-[32px] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex min-h-16 flex-1 items-center rounded-[24px] bg-white/76 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] transition focus-within:bg-white focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_0_0_4px_rgba(143,183,255,.16)]">
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
              <motion.a whileTap={{ scale: 0.985 }} href="#catalog" className="ink-button shine-layer relative inline-flex min-h-16 items-center justify-center gap-2 overflow-hidden rounded-[24px] bg-[#111] px-6 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(17,17,17,.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#23252a] focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50">
                {t.cta} <ArrowRight size={17} />
              </motion.a>
              <motion.a whileTap={{ scale: 0.985 }} href={telegramBotUrl("catalog")} className="shine-layer relative inline-flex min-h-16 items-center justify-center gap-2 overflow-hidden rounded-[24px] border border-black/10 bg-white/62 px-6 text-sm font-semibold text-[#111] shadow-[0_16px_45px_rgba(30,35,45,.07)] transition duration-300 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50 sm:min-w-40">
                <Send size={17} /> {t.telegram}
              </motion.a>
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

      <motion.section id="picks" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-120px" }} variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <motion.div variants={fade} className="mb-7 flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.picksKicker}</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{t.picksTitle}</h2>
          </div>
          <p className="hidden max-w-sm text-sm leading-6 text-[#5f6470] md:block">{t.picksText}</p>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-4">
          {featured.map((skill, index) => <FeatureTile key={skill.slug} skill={skill} index={index} locale={locale} />)}
        </div>
      </motion.section>

      <section id="catalog" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
        <div className="pearl-surface rounded-[36px] p-4 sm:p-6 lg:p-8">
          <div className="mobile-sticky-glass mb-6 flex flex-col gap-5 p-2 sm:p-0 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]"><SlidersHorizontal size={15} /> {t.catalogKicker}</div>
              <h2 className="font-display text-4xl font-semibold sm:text-5xl">{t.catalogTitle}</h2>
            </div>
            <div className="relative max-w-xl flex-1 rounded-[24px] border border-black/10 bg-white/72 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.86),0_14px_44px_rgba(30,35,45,.06)] transition focus-within:bg-white focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_0_0_4px_rgba(143,183,255,.14)]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8e95a3]" size={18} />
              <input value={query} onChange={updateQuery} onInput={updateQuery} onKeyUp={updateQuery} className="w-full bg-transparent pl-8 text-sm font-semibold outline-none placeholder:text-[#8e95a3]" placeholder={t.filter} />
            </div>
          </div>

          <div className="scrollbar-hide -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-2">
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

          <div className="mb-8 grid gap-3 rounded-[30px] border border-black/10 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FilterGroup label={t.compatible}>
                <PillRow>
                  <FilterPill selected={compatible === any} onClick={() => setCompatible(any)}>{t.any}</FilterPill>
                  {compatibilityOptions.map((item) => <FilterPill key={item} selected={compatible === item} onClick={() => setCompatible(item)}>{item}</FilterPill>)}
                </PillRow>
              </FilterGroup>
              <FilterGroup label={t.difficulty}>
                <PillRow>
                  <FilterPill selected={difficulty === any} onClick={() => setDifficulty(any)}>{t.any}</FilterPill>
                  {difficultyOptions.map((item) => <FilterPill key={item} selected={difficulty === item} onClick={() => setDifficulty(item)}>{difficultyLabels[locale][item]}</FilterPill>)}
                </PillRow>
              </FilterGroup>
              <FilterGroup label={t.risk}>
                <PillRow>
                  <FilterPill selected={risk === any} onClick={() => setRisk(any)}>{t.any}</FilterPill>
                  {riskOptions.map((item) => <FilterPill key={item} selected={risk === item} onClick={() => setRisk(item)}>{riskLabels[locale][item]}</FilterPill>)}
                </PillRow>
              </FilterGroup>
              <FilterGroup label={t.scripts}>
                <PillRow>
                  <FilterPill selected={hasScripts === yesNoAll} onClick={() => setHasScripts(yesNoAll)}>{t.any}</FilterPill>
                  <FilterPill selected={hasScripts === "Yes"} onClick={() => setHasScripts("Yes")}>{t.yes}</FilterPill>
                  <FilterPill selected={hasScripts === "No"} onClick={() => setHasScripts("No")}>{t.no}</FilterPill>
                </PillRow>
              </FilterGroup>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <label className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition", freeOnly ? "border-[#111] bg-[#111] text-white shadow-[0_14px_36px_rgba(17,17,17,.14)]" : "border-black/10 bg-white/56 text-[#5f6470] hover:bg-white")}>
                <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.currentTarget.checked)} className="sr-only" />
                {freeOnly && <Check size={14} />} {t.freeOnly}
              </label>
              <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/58 p-1">
                <span className="pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[#8e95a3]">{t.sort}</span>
                <select value={sort} onChange={(event) => setSort(event.currentTarget.value as SortKey)} className="rounded-full border-0 bg-transparent px-2 py-2 text-sm font-bold text-[#111] outline-none">
                  {(["Featured", "Newest", "Popular", "Name", "Score"] as SortKey[]).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/58 px-4 text-sm font-bold text-[#5f6470] transition hover:bg-white hover:text-[#111]">
                  <RotateCcw size={14} /> {t.reset}
                </button>
              )}
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3 px-1 text-sm font-semibold text-[#8e95a3]">
            <span>{t.countLabel} {filtered.length} / {skills.length}</span>
            <span className="hidden sm:inline">{t.filters}</span>
          </div>

          <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {loadingPreview
                ? Array.from({ length: 6 }).map((_, index) => <SkillSkeleton key={index} />)
                : filtered.map((skill, index) => <SkillCard key={skill.slug} skill={skill} index={index} locale={locale} t={t} />)}
            </AnimatePresence>
          </motion.div>
          {!loadingPreview && filtered.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-black/10 bg-white/58 p-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.72)]">
              <p className="font-display text-2xl font-semibold text-[#111]">{t.empty}</p>
              <p className="mt-2 text-sm font-medium text-[#5f6470]">{t.emptyText}</p>
              <button onClick={resetFilters} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#23252a]">
                <RotateCcw size={14} /> {t.reset}
              </button>
            </motion.div>
          )}
        </div>
      </section>

      <section id="submit" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="pearl-surface copy-grid rounded-[36px] p-8 sm:p-12">
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
        <div className="pearl-surface rounded-[36px] p-8 sm:p-12">
          <div className="absolute right-8 top-8 hidden size-24 rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff,#d9dde5_42%,#c9c2ff_100%)] opacity-70 shadow-[0_20px_70px_rgba(143,183,255,.18)] md:block" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.telegramKicker}</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-semibold sm:text-5xl">{t.telegramTitle}</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-[#5f6470]">{t.telegramText}</p>
          <motion.a whileTap={{ scale: 0.985 }} href={telegramBotUrl("catalog")} className="ink-button shine-layer relative mt-7 inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#111] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#23252a]">
            <Send size={16} /> {t.telegramOpen}
          </motion.a>
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
      <motion.div animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="pearl-surface mx-auto max-w-[520px] rounded-[42px] p-5">
        <div className="rounded-[32px] border border-black/10 bg-[linear-gradient(145deg,rgba(255,255,255,.72),rgba(242,243,240,.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#5f6470]"><ShieldCheck size={16} /> {t.shelf}</div>
            <div className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{skills.length} {t.skills}</div>
          </div>
          <div className="space-y-3">
            {featured.map((skill, index) => (
              <motion.div key={skill.slug} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + index * 0.08 }} className="shine-layer group relative overflow-hidden rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-[0_12px_36px_rgba(30,35,45,.06)] transition duration-300 hover:-translate-y-1 hover:bg-white">
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
      <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="pearl-surface absolute bottom-8 left-0 hidden rounded-[28px] p-4 lg:block">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e95a3]">{t.brandLine}</div>
        <div className="mt-1 font-display text-2xl font-semibold">{t.brandCopy}</div>
      </motion.div>
    </motion.div>
  );
}

function FeatureTile({ skill, index, locale }: { skill: Skill; index: number; locale: "en" | "ru" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.06, duration: 0.55 }} className="pearl-surface group rounded-[28px] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/82">
      <div className="mb-5 flex items-center justify-between">
        <span className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{skill.emoji} {categoryLabels[locale][skill.category]}</span>
        <span className="text-sm font-bold text-[#7b8392]">{skill.score}</span>
      </div>
      <h3 className="font-display text-3xl font-semibold">{skillTitle(skill, locale)}</h3>
      <p className="mt-3 text-sm leading-6 text-[#5f6470]">{skillSummary(skill, locale)}</p>
    </motion.div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-black/10 bg-white/48 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8e95a3]">{label}</p>
      {children}
    </div>
  );
}

function PillRow({ children }: { children: ReactNode }) {
  return <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">{children}</div>;
}

function FilterPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn("relative shrink-0 rounded-full px-3 py-2 text-xs font-bold transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50", selected ? "text-white" : "border border-black/10 bg-white/58 text-[#5f6470] hover:bg-white hover:text-[#111]") }>
      {selected && <motion.span className="absolute inset-0 rounded-full bg-[#111] shadow-[0_10px_26px_rgba(17,17,17,.14)]" transition={{ type: "spring", stiffness: 430, damping: 34 }} />}
      <span className="relative">{children}</span>
    </button>
  );
}

function SkillCard({ skill, index, locale, t }: { skill: Skill; index: number; locale: "en" | "ru"; t: typeof copy.en | typeof copy.ru }) {
  return (
    <motion.article layout initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.34, delay: Math.min(index * 0.025, 0.18) }} whileHover={{ y: -6, rotateX: 1, rotateY: -1 }} className="pearl-surface group rounded-[30px] p-5 transition-colors duration-300 hover:bg-white/86">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-start gap-3 font-display text-[1.72rem] font-semibold leading-[1.02] tracking-normal">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-[1.45rem] leading-none">{skill.emoji}</span>
            <span>{skillTitle(skill, locale)}</span>
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#f2f3f0] px-3 py-1 text-xs font-bold text-[#5f6470]">{categoryLabels[locale][skill.category]}</span>
            <span className="rounded-full border border-black/10 bg-white/46 px-3 py-1 text-xs font-bold text-[#7b8392]">{skill.hasScripts ? "Script" : "Safe"}</span>
          </div>
        </div>
        <div className="shrink-0 rounded-[18px] border border-black/10 bg-white/70 px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.8)]" aria-label={`Curated score ${skill.score}`}>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8e95a3]">Score</div>
          <div className="font-display text-2xl font-semibold leading-none">{skill.score}</div>
        </div>
      </div>
      <p className="line-clamp-2 min-h-12 text-sm leading-6 text-[#5f6470]">{skillSummary(skill, locale)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {skillTags(skill, locale).slice(0, 3).map((tag) => <span key={tag} className="rounded-full border border-black/10 bg-white/42 px-3 py-1 text-xs font-semibold text-[#5f6470]">{tag}</span>)}
      </div>
      <div className="mt-5 grid gap-3 rounded-[22px] border border-black/10 bg-[#f7f7f4]/62 p-3 text-xs font-semibold text-[#5f6470]">
        <div className="flex flex-wrap gap-1.5">
          {skill.compatibility.map((item) => <span key={item} className="rounded-full bg-white/70 px-2.5 py-1 text-[#111]">{item}</span>)}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <MiniStat label={t.difficulty} value={difficultyLabels[locale][skill.difficulty]} />
          <MiniStat label={t.risk} value={riskLabels[locale][skill.risk]} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-2">
        <motion.a whileTap={{ scale: 0.985 }} href={telegramSkillUrl(skill.slug)} className="ink-button shine-layer relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#111] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#23252a]">
          <Send size={15} /> {t.getTelegram}
        </motion.a>
        <Link href={`/skills/${skill.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/62 px-4 py-2.5 text-sm font-semibold text-[#111] transition duration-300 hover:bg-white">
          {t.open} <ArrowRight size={15} />
        </Link>
      </div>
    </motion.article>
  );
}

function SkillSkeleton() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pearl-surface rounded-[30px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="skeleton-line h-8 w-2/3" />
          <div className="skeleton-line h-5 w-1/2" />
        </div>
        <div className="skeleton-line h-14 w-16 rounded-[18px]" />
      </div>
      <div className="space-y-2">
        <div className="skeleton-line h-4 w-full" />
        <div className="skeleton-line h-4 w-4/5" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="skeleton-line h-7" />
        <div className="skeleton-line h-7" />
        <div className="skeleton-line h-7" />
      </div>
      <div className="mt-5 skeleton-line h-12 w-full rounded-full" />
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[16px] bg-white/58 px-2 py-2">
      <div className="truncate text-[10px] uppercase tracking-[0.12em] text-[#8e95a3]">{label}</div>
      <div className="mt-0.5 truncate font-bold text-[#111]">{value}</div>
    </div>
  );
}
