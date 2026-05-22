"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Grid2X2, List, RotateCcw, Search, Send, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/brand";
import { categories, categoryLabels, compatibilityOptions, difficultyLabels, difficultyOptions, riskLabels, riskOptions, skillSummary, skillTags, skillTitle, skills, type Category, type Compatibility, type Difficulty, type Risk, type Skill } from "@/lib/skills";
import { telegramBotUrl, telegramSkillUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const all = "All";
const any = "Any";
type SortKey = "Featured" | "Newest" | "Popular" | "Name" | "Score";
type HasScriptsFilter = "All" | "Yes" | "No";
type ViewMode = "grid" | "list";

const copy = {
  en: {
    nav: ["Catalog", "About", "Submit"],
    eyebrow: "Catalog",
    title: "Find the right skill quickly.",
    subtitle: "Search practical workflows, filter by agent compatibility, and get skills through Telegram.",
    search: "Search skills, tags, use cases, agents...",
    clear: "Clear search",
    filters: "Filters",
    close: "Close",
    sort: "Sort",
    compatible: "Compatible",
    difficulty: "Difficulty",
    risk: "Risk",
    scripts: "Scripts",
    freeOnly: "Free only",
    yes: "Yes",
    no: "No",
    any: "Any",
    reset: "Reset filters",
    showing: "Showing",
    total: "total",
    empty: "No skills found.",
    emptyText: "Clear filters or try a simpler search term.",
    get: "Get",
    getFull: "Get via Telegram",
    details: "Details",
    grid: "Grid",
    list: "List",
    score: "Score",
    telegram: "Telegram bot",
  },
  ru: {
    nav: ["Каталог", "О проекте", "Отправить"],
    eyebrow: "Каталог",
    title: "Быстро найти нужный skill.",
    subtitle: "Ищите workflows, фильтруйте по совместимости и получайте skills через Telegram.",
    search: "Искать skills, tags, use cases, agents...",
    clear: "Очистить поиск",
    filters: "Фильтры",
    close: "Закрыть",
    sort: "Сортировка",
    compatible: "Совместимость",
    difficulty: "Сложность",
    risk: "Риск",
    scripts: "Scripts",
    freeOnly: "Только бесплатно",
    yes: "Да",
    no: "Нет",
    any: "Любые",
    reset: "Сбросить фильтры",
    showing: "Показано",
    total: "всего",
    empty: "Skills не найдены.",
    emptyText: "Сбросьте фильтры или попробуйте более простой запрос.",
    get: "Получить",
    getFull: "Получить в Telegram",
    details: "Подробнее",
    grid: "Сетка",
    list: "Список",
    score: "Оценка",
    telegram: "Telegram bot",
  },
} as const;

export function CatalogPageExperience() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Category | typeof all>(all);
  const [compatible, setCompatible] = useState<Compatibility | typeof any>(any);
  const [difficulty, setDifficulty] = useState<Difficulty | typeof any>(any);
  const [risk, setRisk] = useState<Risk | typeof any>(any);
  const [hasScripts, setHasScripts] = useState<HasScriptsFilter>("All");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("Featured");
  const [view, setView] = useState<ViewMode>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { locale, setLocale } = useLocale();
  const t = copy[locale];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
    track("page_view", { page: "catalog" });
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = skills.filter((skill) => {
      const searchable = [
        skill.title,
        skill.description,
        skill.longDescription,
        skill.ru.summary,
        skill.ru.description,
        skill.category,
        categoryLabels.en[skill.category],
        categoryLabels.ru[skill.category],
        skill.difficulty,
        skill.risk,
        ...skill.tags,
        ...skill.ru.tags,
        ...skill.compatibility,
        ...skill.useCases,
        ...skill.ru.useCases,
        ...skill.examples,
      ].join(" ").toLowerCase();
      return (active === all || skill.category === active)
        && (compatible === any || skill.compatibility.includes(compatible))
        && (difficulty === any || skill.difficulty === difficulty)
        && (risk === any || skill.risk === risk)
        && (hasScripts === "All" || skill.hasScripts === (hasScripts === "Yes"))
        && (!freeOnly || skill.free)
        && (!q || searchable.includes(q));
    });
    return [...result].sort((a, b) => {
      if (sort === "Featured") return Number(b.featured) - Number(a.featured) || b.score - a.score;
      if (sort === "Newest") return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      if (sort === "Popular") return b.popularity - a.popularity;
      if (sort === "Name") return skillTitle(a, locale).localeCompare(skillTitle(b, locale));
      return b.score - a.score;
    });
  }, [query, active, compatible, difficulty, risk, hasScripts, freeOnly, sort, locale]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timeout = window.setTimeout(() => track("search_query", { query: trimmed, results: filtered.length }), 550);
    return () => window.clearTimeout(timeout);
  }, [query, filtered.length]);

  const hasActiveFilters = query || active !== all || compatible !== any || difficulty !== any || risk !== any || hasScripts !== "All" || freeOnly;
  const resetFilters = () => {
    setQuery("");
    setActive(all);
    setCompatible(any);
    setDifficulty(any);
    setRisk(any);
    setHasScripts("All");
    setFreeOnly(false);
    setSort("Featured");
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden opacity-80">
        <div className="absolute left-1/2 top-0 h-[430px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.9),rgba(217,221,229,.24)_48%,transparent_74%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-28 h-80 opacity-35" />
      </div>

      <TopNav t={t} locale={locale} setLocale={setLocale} />

      <section className="mx-auto w-full max-w-7xl px-5 pb-10 pt-6 sm:px-8">
        <div className="mobile-sticky-glass z-30 mb-5 rounded-[30px] p-2 sm:p-0">
          <div className="spotlight-panel rounded-[28px] p-2">
            <label className="relative flex min-h-14 items-center rounded-[22px] bg-white/76 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] transition focus-within:bg-white focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_0_0_4px_rgba(143,183,255,.14)]">
              <Search size={20} className="mr-3 shrink-0 text-[#8e95a3]" />
              <input aria-label={t.search} value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={t.search} className="w-full bg-transparent text-sm font-semibold text-[#111] outline-none placeholder:text-[#8e95a3] sm:text-base" />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label={t.clear} className="ml-2 grid size-9 shrink-0 place-items-center rounded-full border border-black/10 bg-white/70 text-[#7b8392] transition hover:bg-white hover:text-[#111]">
                  <X size={16} />
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.eyebrow}</p>
            <h1 className="mt-2 font-display text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[0.94] tracking-normal">{t.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f6470] sm:text-lg">{t.subtitle}</p>
          </div>
          <a href={telegramBotUrl("catalog")} onClick={() => track("telegram_click", { source: "catalog_header", payload: "catalog" })} className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2.5 text-sm font-semibold text-[#111] shadow-[0_14px_36px_rgba(30,35,45,.06)] transition hover:bg-white md:inline-flex">
            <Send size={16} /> {t.telegram}
          </a>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            {([all, ...categories] as Array<Category | typeof all>).map((category) => (
              <button key={category} type="button" onClick={() => { setActive(category); track("category_click", { category }); }} className={cn("relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50", active === category ? "ink-button bg-[#111] text-white shadow-[0_14px_36px_rgba(17,17,17,.14)]" : "border border-black/10 bg-white/58 text-[#5f6470] hover:bg-white hover:text-[#111]") }>
                {categoryLabels[locale][category]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white/64 px-4 text-sm font-bold text-[#111] shadow-[0_14px_36px_rgba(30,35,45,.06)] md:hidden">
            <SlidersHorizontal size={16} /> {t.filters}
          </button>
        </div>

        <div className="mb-5 hidden rounded-[28px] border border-black/10 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] md:block">
          <div className="flex flex-wrap items-end gap-3">
            <FilterGroup label={t.compatible}><PillRow><FilterPill selected={compatible === any} onClick={() => setCompatible(any)}>{t.any}</FilterPill>{compatibilityOptions.map((item) => <FilterPill key={item} selected={compatible === item} onClick={() => setCompatible(item)}>{item}</FilterPill>)}</PillRow></FilterGroup>
            <FilterGroup label={t.difficulty}><PillRow><FilterPill selected={difficulty === any} onClick={() => setDifficulty(any)}>{t.any}</FilterPill>{difficultyOptions.map((item) => <FilterPill key={item} selected={difficulty === item} onClick={() => setDifficulty(item)}>{difficultyLabels[locale][item]}</FilterPill>)}</PillRow></FilterGroup>
            <FilterGroup label={t.risk}><PillRow><FilterPill selected={risk === any} onClick={() => setRisk(any)}>{t.any}</FilterPill>{riskOptions.map((item) => <FilterPill key={item} selected={risk === item} onClick={() => setRisk(item)}>{riskLabels[locale][item]}</FilterPill>)}</PillRow></FilterGroup>
            <FilterGroup label={t.scripts}><PillRow><FilterPill selected={hasScripts === "All"} onClick={() => setHasScripts("All")}>{t.any}</FilterPill><FilterPill selected={hasScripts === "Yes"} onClick={() => setHasScripts("Yes")}>{t.yes}</FilterPill><FilterPill selected={hasScripts === "No"} onClick={() => setHasScripts("No")}>{t.no}</FilterPill></PillRow></FilterGroup>
            <label className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition", freeOnly ? "border-[#111] bg-[#111] text-white shadow-[0_14px_36px_rgba(17,17,17,.14)]" : "border-black/10 bg-white/56 text-[#5f6470] hover:bg-white")}>
              <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.currentTarget.checked)} className="sr-only" />
              {freeOnly && <Check size={14} />} {t.freeOnly}
            </label>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-[#8e95a3]">
          <span>{t.showing} {filtered.length} / {skills.length} {t.total}</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-black/10 bg-white/58 p-1 md:flex">
              <button type="button" onClick={() => setView("grid")} className={cn("inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold transition", view === "grid" ? "ink-button bg-[#111] text-white" : "text-[#5f6470] hover:bg-white hover:text-[#111]")}><Grid2X2 size={14} /> {t.grid}</button>
              <button type="button" onClick={() => setView("list")} className={cn("inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold transition", view === "list" ? "ink-button bg-[#111] text-white" : "text-[#5f6470] hover:bg-white hover:text-[#111]")}><List size={14} /> {t.list}</button>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/58 p-1">
              <span className="pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[#8e95a3]">{t.sort}</span>
              <select aria-label={t.sort} value={sort} onChange={(event) => setSort(event.currentTarget.value as SortKey)} className="rounded-full border-0 bg-transparent px-2 py-2 text-sm font-bold text-[#111] outline-none">
                {(["Featured", "Newest", "Popular", "Name", "Score"] as SortKey[]).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            {hasActiveFilters && <button type="button" onClick={resetFilters} className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white/58 px-4 text-sm font-bold text-[#5f6470] transition hover:bg-white hover:text-[#111]"><RotateCcw size={14} /> {t.reset}</button>}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-black/10 bg-white/58 p-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.72)]">
              <p className="font-display text-2xl font-semibold text-[#111]">{t.empty}</p>
              <p className="mt-2 text-sm font-medium text-[#5f6470]">{t.emptyText}</p>
              <button onClick={resetFilters} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#23252a]"><RotateCcw size={14} /> {t.reset}</button>
            </motion.div>
          ) : view === "list" || isMobile ? (
            <motion.div layout className="grid gap-3">
              {filtered.map((skill, index) => <SkillRow key={skill.slug} skill={skill} index={index} locale={locale} t={t} />)}
            </motion.div>
          ) : (
            <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((skill, index) => <SkillCard key={skill.slug} skill={skill} index={index} locale={locale} t={t} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <MobileFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} t={t} locale={locale} compatible={compatible} setCompatible={setCompatible} difficulty={difficulty} setDifficulty={setDifficulty} risk={risk} setRisk={setRisk} hasScripts={hasScripts} setHasScripts={setHasScripts} freeOnly={freeOnly} setFreeOnly={setFreeOnly} resetFilters={resetFilters} />
      <SiteFooter />
    </main>
  );
}

function TopNav({ t, locale, setLocale }: { t: typeof copy.en | typeof copy.ru; locale: "en" | "ru"; setLocale: (locale: "en" | "ru") => void }) {
  return (
    <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Wordmark />
      <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/52 px-2 py-2 shadow-[0_16px_50px_rgba(30,35,45,.06)] backdrop-blur-xl md:flex">
        {t.nav.map((item, index) => <Link key={item} href={index === 0 ? "/catalog" : index === 1 ? "/about" : "/submit"} className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6470] transition hover:bg-white hover:text-[#111]">{item}</Link>)}
      </div>
      <LocaleToggle locale={locale} setLocale={setLocale} />
    </nav>
  );
}

function SkillCard({ skill, index, locale, t }: { skill: Skill; index: number; locale: "en" | "ru"; t: typeof copy.en | typeof copy.ru }) {
  return (
    <motion.article layout initial={{ opacity: 0, y: 14, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, delay: Math.min(index * 0.014, 0.12) }} className="pearl-surface rounded-[24px] p-4 md:rounded-[28px] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex min-w-0 items-start gap-2 font-display text-[1.35rem] font-semibold leading-[1.04] md:text-[1.65rem]"><span className="shrink-0 text-[1.2rem] md:text-[1.45rem]">{skill.emoji}</span><span className="min-w-0">{skillTitle(skill, locale)}</span></h2>
          <p className="line-clamp-2 mt-2 text-sm leading-5 text-[#5f6470] md:leading-6">{skillSummary(skill, locale)}</p>
        </div>
        <div className="shrink-0 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs font-bold text-[#111] md:rounded-[16px] md:px-3 md:py-2" aria-label={`${t.score} ${skill.score}`}>{skill.score}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#5f6470]">
        <span className="rounded-full bg-[#f2f3f0] px-2.5 py-1">{categoryLabels[locale][skill.category]}</span>
        <span className="rounded-full border border-black/10 bg-white/52 px-2.5 py-1 md:hidden">{difficultyLabels[locale][skill.difficulty]} · {riskLabels[locale][skill.risk]}</span>
        {skill.compatibility.slice(0, 3).map((item) => <span key={item} className="rounded-full border border-black/10 bg-white/52 px-2.5 py-1">{item}</span>)}
      </div>
      <div className="mt-3 hidden flex-wrap gap-2 md:flex">
        {skillTags(skill, locale).slice(0, 3).map((tag) => <span key={tag} className="rounded-full border border-black/10 bg-white/42 px-3 py-1 text-xs font-semibold text-[#5f6470]">{tag}</span>)}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-2">
        <a href={telegramSkillUrl(skill.slug)} onClick={() => track("telegram_click", { source: "catalog_card", slug: skill.slug })} className="ink-button shine-layer relative inline-flex min-h-10 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#111] px-3 text-sm font-semibold text-white transition hover:bg-[#23252a] md:min-h-11 md:px-4">
          <Send size={15} /> <span className="md:hidden">{t.get}</span><span className="hidden md:inline">{t.getFull}</span>
        </a>
        <Link href={`/skills/${skill.slug}`} onClick={() => track("skill_open", { slug: skill.slug, source: "catalog_card" })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/62 px-3 text-sm font-semibold text-[#111] transition hover:bg-white md:min-h-11 md:px-4">
          {t.details} <ArrowRight size={15} />
        </Link>
      </div>
    </motion.article>
  );
}

function SkillRow({ skill, index, locale, t }: { skill: Skill; index: number; locale: "en" | "ru"; t: typeof copy.en | typeof copy.ru }) {
  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: Math.min(index * 0.01, 0.1) }} className="pearl-surface rounded-[22px] p-3 md:p-4">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold"><span className="mr-2 text-lg">{skill.emoji}</span>{skillTitle(skill, locale)}</h2>
          <p className="line-clamp-2 mt-1 text-sm leading-5 text-[#5f6470]">{skillSummary(skill, locale)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold text-[#5f6470]"><span className="rounded-full bg-[#f2f3f0] px-2.5 py-1">{categoryLabels[locale][skill.category]}</span><span className="rounded-full border border-black/10 bg-white/52 px-2.5 py-1">{skill.compatibility[0]}</span></div>
        </div>
        <div className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs font-bold text-[#111]">{skill.score}</div>
        <a href={telegramSkillUrl(skill.slug)} onClick={() => track("telegram_click", { source: "catalog_row", slug: skill.slug })} className="ink-button hidden min-h-10 items-center justify-center gap-2 rounded-full bg-[#111] px-4 text-sm font-semibold text-white md:inline-flex"><Send size={15} /> {t.get}</a>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 md:hidden">
        <a href={telegramSkillUrl(skill.slug)} onClick={() => track("telegram_click", { source: "catalog_row", slug: skill.slug })} className="ink-button inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#111] px-3 text-sm font-semibold text-white"><Send size={15} /> {t.get}</a>
        <Link href={`/skills/${skill.slug}`} onClick={() => track("skill_open", { slug: skill.slug, source: "catalog_row" })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/62 px-3 text-sm font-semibold text-[#111]">{t.details}</Link>
      </div>
    </motion.article>
  );
}

function MobileFilters(props: { open: boolean; onClose: () => void; t: typeof copy.en | typeof copy.ru; locale: "en" | "ru"; compatible: Compatibility | typeof any; setCompatible: (value: Compatibility | typeof any) => void; difficulty: Difficulty | typeof any; setDifficulty: (value: Difficulty | typeof any) => void; risk: Risk | typeof any; setRisk: (value: Risk | typeof any) => void; hasScripts: HasScriptsFilter; setHasScripts: (value: HasScriptsFilter) => void; freeOnly: boolean; setFreeOnly: (value: boolean) => void; resetFilters: () => void }) {
  const { open, onClose, t, locale } = props;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#111]/18 backdrop-blur-sm md:hidden" onClick={onClose}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 360, damping: 36 }} className="pearl-surface absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[34px] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-3xl font-semibold">{t.filters}</h2><button type="button" onClick={onClose} aria-label={t.close} className="grid size-10 place-items-center rounded-full border border-black/10 bg-white/70"><X size={18} /></button></div>
            <div className="space-y-3">
              <FilterGroup label={t.compatible}><PillRow><FilterPill selected={props.compatible === any} onClick={() => props.setCompatible(any)}>{t.any}</FilterPill>{compatibilityOptions.map((item) => <FilterPill key={item} selected={props.compatible === item} onClick={() => props.setCompatible(item)}>{item}</FilterPill>)}</PillRow></FilterGroup>
              <FilterGroup label={t.difficulty}><PillRow><FilterPill selected={props.difficulty === any} onClick={() => props.setDifficulty(any)}>{t.any}</FilterPill>{difficultyOptions.map((item) => <FilterPill key={item} selected={props.difficulty === item} onClick={() => props.setDifficulty(item)}>{difficultyLabels[locale][item]}</FilterPill>)}</PillRow></FilterGroup>
              <FilterGroup label={t.risk}><PillRow><FilterPill selected={props.risk === any} onClick={() => props.setRisk(any)}>{t.any}</FilterPill>{riskOptions.map((item) => <FilterPill key={item} selected={props.risk === item} onClick={() => props.setRisk(item)}>{riskLabels[locale][item]}</FilterPill>)}</PillRow></FilterGroup>
              <FilterGroup label={t.scripts}><PillRow><FilterPill selected={props.hasScripts === "All"} onClick={() => props.setHasScripts("All")}>{t.any}</FilterPill><FilterPill selected={props.hasScripts === "Yes"} onClick={() => props.setHasScripts("Yes")}>{t.yes}</FilterPill><FilterPill selected={props.hasScripts === "No"} onClick={() => props.setHasScripts("No")}>{t.no}</FilterPill></PillRow></FilterGroup>
              <label className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition", props.freeOnly ? "border-[#111] bg-[#111] text-white" : "border-black/10 bg-white/56 text-[#5f6470]")}><input type="checkbox" checked={props.freeOnly} onChange={(event) => props.setFreeOnly(event.currentTarget.checked)} className="sr-only" />{props.freeOnly && <Check size={14} />} {t.freeOnly}</label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={props.resetFilters} className="rounded-full border border-black/10 bg-white/64 px-4 py-3 text-sm font-bold text-[#5f6470]">{t.reset}</button><button type="button" onClick={onClose} className="ink-button rounded-full bg-[#111] px-4 py-3 text-sm font-bold text-white">{t.close}</button></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-[22px] border border-black/10 bg-white/48 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8e95a3]">{label}</p>{children}</div>;
}

function PillRow({ children }: { children: ReactNode }) {
  return <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">{children}</div>;
}

function FilterPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("relative shrink-0 rounded-full px-3 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50", selected ? "ink-button bg-[#111] text-white shadow-[0_10px_26px_rgba(17,17,17,.14)]" : "border border-black/10 bg-white/58 text-[#5f6470] hover:bg-white hover:text-[#111]")}>{children}</button>;
}
