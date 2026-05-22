"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Grid2X2, List, Loader2, PackageCheck, Plus, RotateCcw, Search, Send, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/brand";
import { categories, categoryLabels, compatibilityOptions, difficultyLabels, difficultyOptions, riskLabels, riskOptions, skillSummary, skillTitle, skills, type Category, type Compatibility, type Difficulty, type Risk, type Skill } from "@/lib/skills";
import { telegramBotUrl } from "@/lib/site-config";
import { createPack, telegramPackUrl } from "@/lib/pack-client";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const all = "All";
const any = "Any";
const basketStorageKey = "codex-skills-basket";
const basketLimit = 12;
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
    basket: "Skill Pack",
    selected: "selected",
    add: "Add",
    added: "Added",
    remove: "Remove",
    clearAll: "Clear all",
    generatePrompt: "Generate prompt",
    openTelegram: "Open in Telegram",
    noSkills: "No skills selected",
    noSkillsText: "Add skills to build an agent prompt.",
    tooMany: "Skill Pack can include up to 12 skills.",
    noSelectedError: "No skills selected.",
    packFailed: "Pack creation failed.",
    botMissing: "Bot username missing.",
    networkError: "Network error.",
    retry: "Retry",
    popular: "Popular searches",
    shelves: "Curated shelves",
    shelfWhy: "Why this collection",
    fullList: "Full catalog",
    quickQueries: ["frontend polish", "testing", "safe", "deploy", "docs", "security"],
    collections: [
      { title: "Editor's picks", why: "High-signal skills that cover design, QA, security, and deployment without much setup." },
      { title: "Safe for beginners", why: "Low-risk workflows that help you build better habits before running scripts." },
      { title: "Frontend polish", why: "Small passes for layout, accessibility, copy, and mobile quality." },
      { title: "Power tools", why: "More advanced skills for releases, security reviews, migrations, and automation." },
    ],
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
    basket: "Набор skills",
    selected: "выбрано",
    add: "Добавить",
    added: "Добавлено",
    remove: "Убрать",
    clearAll: "Очистить",
    generatePrompt: "Собрать промпт",
    openTelegram: "Открыть в Telegram",
    noSkills: "Skills не выбраны",
    noSkillsText: "Добавьте skills, чтобы собрать agent prompt.",
    tooMany: "В наборе может быть максимум 12 skills.",
    noSelectedError: "Skills не выбраны.",
    packFailed: "Не удалось создать pack.",
    botMissing: "Bot username не задан.",
    networkError: "Network error.",
    retry: "Повторить",
    popular: "Популярные запросы",
    shelves: "Подборки",
    shelfWhy: "Почему эта подборка",
    fullList: "Полный каталог",
    quickQueries: ["frontend polish", "testing", "safe", "deploy", "docs", "security"],
    collections: [
      { title: "Выбор редакции", why: "Самые полезные skills для дизайна, QA, безопасности и деплоя без лишней настройки." },
      { title: "Безопасно для старта", why: "Низкорисковые workflows, которые помогают навести порядок без запуска сложных scripts." },
      { title: "Frontend polish", why: "Короткие passes для layout, accessibility, copy и mobile качества." },
      { title: "Power tools", why: "Более продвинутые skills для релизов, security review, migrations и automation." },
    ],
  },
} as const;

const collectionFilters = [
  (skill: Skill) => skill.featured,
  (skill: Skill) => skill.risk === "Low" && skill.difficulty === "Easy",
  (skill: Skill) => ["Frontend", "Design"].includes(skill.category) || skill.tags.some((tag) => ["a11y", "mobile", "copy", "UI", "performance"].includes(tag)),
  (skill: Skill) => skill.difficulty === "Advanced" || skill.risk === "High" || skill.hasScripts,
];

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
  const [basketOpen, setBasketOpen] = useState(false);
  const [basket, setBasket] = useState<string[]>([]);
  const [basketNotice, setBasketNotice] = useState("");
  const [packError, setPackError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastPackUrl, setLastPackUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const { locale, setLocale } = useLocale();
  const t = copy[locale];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
    track("page_view", { page: "catalog" });
    const savedBasket = window.localStorage.getItem(basketStorageKey);
    if (savedBasket) {
      try {
        const slugs = JSON.parse(savedBasket) as string[];
        setBasket(slugs.filter((slug) => skills.some((skill) => skill.slug === slug)).slice(0, basketLimit));
      } catch {
        window.localStorage.removeItem(basketStorageKey);
      }
    }
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(basketStorageKey, JSON.stringify(basket));
  }, [basket]);

  useEffect(() => {
    if (!basketNotice && !packError) return;
    const timeout = window.setTimeout(() => {
      setBasketNotice("");
      setPackError("");
    }, 3200);
    return () => window.clearTimeout(timeout);
  }, [basketNotice, packError]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
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
        skill.marker,
        skill.setup,
        skill.source,
        ...skill.tags,
        ...skill.ru.tags,
        ...skill.compatibility,
        ...skill.useCases,
        ...skill.ru.useCases,
        ...skill.examples,
        ...(skill.category === "Frontend" || skill.category === "Design" ? ["frontend polish visual mobile ui"] : []),
        ...(skill.risk === "Low" && skill.difficulty === "Easy" ? ["safe beginner easy"] : []),
        ...(skill.category === "Deployment" ? ["deploy deployment release"] : []),
      ].join(" ").toLowerCase();
      return (active === all || skill.category === active)
        && (compatible === any || skill.compatibility.includes(compatible))
        && (difficulty === any || skill.difficulty === difficulty)
        && (risk === any || skill.risk === risk)
        && (hasScripts === "All" || skill.hasScripts === (hasScripts === "Yes"))
        && (!freeOnly || skill.free)
        && (!terms.length || terms.every((term) => searchable.includes(term)));
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
  const collections = useMemo(() => copy[locale].collections.map((collection, index) => ({
    ...collection,
    skills: skills.filter(collectionFilters[index]).sort((a, b) => b.score - a.score).slice(0, 5),
  })), [locale]);
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
  const selectedSkills = useMemo(() => basket.map((slug) => skills.find((skill) => skill.slug === slug)).filter(Boolean) as Skill[], [basket]);
  const addSkill = (skill: Skill) => {
    setPackError("");
    setBasket((current) => {
      if (current.includes(skill.slug)) return current;
      if (current.length >= basketLimit) {
        setBasketNotice(t.tooMany);
        return current;
      }
      setBasketNotice("");
      track("basket_add", { slug: skill.slug });
      return [...current, skill.slug];
    });
  };
  const removeSkill = (slug: string) => setBasket((current) => current.filter((item) => item !== slug));
  const toggleSkill = (skill: Skill) => basket.includes(skill.slug) ? removeSkill(skill.slug) : addSkill(skill);
  const generatePrompt = async () => {
    setPackError("");
    setLastPackUrl("");
    if (!basket.length) {
      setPackError(t.noSelectedError);
      return;
    }
    if (basket.length > basketLimit) {
      setPackError(t.tooMany);
      return;
    }
    setIsGenerating(true);
    try {
      const pack = await createPack({ slugs: basket, language: locale, source: "catalog" });
      const url = telegramPackUrl(pack.packId);
      setLastPackUrl(url);
      track("pack_create", { packId: pack.packId, count: basket.length });
      window.location.href = url;
    } catch (error) {
      const message = error instanceof Error ? error.message : t.networkError;
      setPackError(message || t.packFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden opacity-80">
        <div className="absolute left-1/2 top-0 h-[430px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.9),rgba(217,221,229,.24)_48%,transparent_74%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-28 h-80 opacity-35" />
      </div>

      <TopNav t={t} locale={locale} setLocale={setLocale} basketCount={basket.length} onOpenBasket={() => { setFiltersOpen(false); setBasketOpen(true); }} />

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
          <div className="mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 text-xs font-bold text-[#8e95a3] scrollbar-hide">
            <span className="shrink-0 uppercase tracking-[0.14em]">{t.popular}</span>
            {t.quickQueries.map((item) => (
              <button key={item} type="button" onClick={() => setQuery(item)} className="shrink-0 rounded-full border border-black/10 bg-white/54 px-3 py-1.5 text-[#5f6470] transition hover:bg-white hover:text-[#111]">
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.eyebrow}</p>
            <h1 className="mt-2 text-[clamp(2rem,3.4vw,3.25rem)] font-semibold leading-[1.02] tracking-normal">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#5f6470]">{t.subtitle}</p>
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
          <button type="button" onClick={() => { setBasketOpen(false); setFiltersOpen(true); }} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white/64 px-4 text-sm font-bold text-[#111] shadow-[0_14px_36px_rgba(30,35,45,.06)] md:hidden">
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

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{t.shelves}</h2>
            <span className="hidden text-xs font-semibold text-[#8e95a3] sm:inline">{t.shelfWhy}</span>
          </div>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
            {collections.map((collection, index) => <CollectionShelf key={collection.title} collection={collection} index={index} locale={locale} />)}
          </div>
        </section>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-[#8e95a3]">
          <span><span className="text-[#111]">{t.fullList}</span> · {t.showing} {filtered.length} / {skills.length} {t.total}</span>
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
          ) : view === "list" && !isMobile ? (
            <motion.div layout className="grid gap-3">
              {filtered.map((skill, index) => <SkillRow key={skill.slug} skill={skill} index={index} locale={locale} t={t} isAdded={basket.includes(skill.slug)} onToggle={() => toggleSkill(skill)} />)}
            </motion.div>
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((skill, index) => <SkillCard key={skill.slug} skill={skill} index={index} locale={locale} t={t} isAdded={basket.includes(skill.slug)} onToggle={() => toggleSkill(skill)} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <SkillPackPanel open={basketOpen} onClose={() => setBasketOpen(false)} t={t} locale={locale} selectedSkills={selectedSkills} removeSkill={removeSkill} clear={() => setBasket([])} generatePrompt={generatePrompt} isGenerating={isGenerating} error={packError} notice={basketNotice} lastPackUrl={lastPackUrl} />
      <MobileFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} t={t} locale={locale} compatible={compatible} setCompatible={setCompatible} difficulty={difficulty} setDifficulty={setDifficulty} risk={risk} setRisk={setRisk} hasScripts={hasScripts} setHasScripts={setHasScripts} freeOnly={freeOnly} setFreeOnly={setFreeOnly} resetFilters={resetFilters} />
      <SiteFooter />
    </main>
  );
}

function TopNav({ t, locale, setLocale, basketCount, onOpenBasket }: { t: typeof copy.en | typeof copy.ru; locale: "en" | "ru"; setLocale: (locale: "en" | "ru") => void; basketCount: number; onOpenBasket: () => void }) {
  return (
    <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Wordmark />
      <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/52 px-2 py-2 shadow-[0_16px_50px_rgba(30,35,45,.06)] backdrop-blur-xl md:flex">
        {t.nav.map((item, index) => <Link key={item} href={index === 0 ? "/catalog" : index === 1 ? "/about" : "/submit"} className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6470] transition hover:bg-white hover:text-[#111]">{item}</Link>)}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpenBasket} className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white/62 px-3 text-sm font-bold text-[#111] shadow-[0_14px_42px_rgba(30,35,45,.06)] backdrop-blur-xl transition hover:bg-white" aria-label={`${t.basket}: ${basketCount}`}>
          <PackageCheck size={16} /> <span className="hidden sm:inline">{t.basket}</span><span className="grid min-w-5 place-items-center rounded-full bg-[#111] px-1.5 text-[11px] leading-5 text-white">{basketCount}</span>
        </button>
        <LocaleToggle locale={locale} setLocale={setLocale} />
      </div>
    </nav>
  );
}

function SkillCard({ skill, index, locale, t, isAdded, onToggle }: { skill: Skill; index: number; locale: "en" | "ru"; t: typeof copy.en | typeof copy.ru; isAdded: boolean; onToggle: () => void }) {
  return (
    <motion.article layout initial={{ opacity: 0, y: 14, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, delay: Math.min(index * 0.014, 0.12) }} className="pearl-surface rounded-[20px] p-3 md:rounded-[28px] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex min-w-0 items-start gap-1.5 text-[1rem] font-bold leading-[1.08] md:gap-2 md:font-display md:text-[1.65rem] md:font-semibold md:leading-[1.04]"><span className="shrink-0 text-[1rem] md:text-[1.45rem]">{skill.emoji}</span><span className="min-w-0">{skillTitle(skill, locale)}</span></h2>
          <p className="line-clamp-2 mt-2 text-[12px] font-medium leading-4 text-[#5f6470] md:text-sm md:leading-6">{skillSummary(skill, locale)}</p>
        </div>
        <div className="w-fit shrink-0 rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[11px] font-bold text-[#111] md:rounded-[16px] md:px-3 md:py-2 md:text-xs" aria-label={`${t.score} ${skill.score}`}>{skill.score}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#5f6470] md:text-xs">
        <span className="rounded-full bg-[#f2f3f0] px-2 py-1 md:px-2.5">{categoryLabels[locale][skill.category]}</span>
        {skill.compatibility.slice(0, 2).map((item) => <span key={item} className="hidden rounded-full border border-black/10 bg-white/52 px-2.5 py-1 md:inline-flex">{item}</span>)}
      </div>
      <div className="mt-3 grid grid-cols-1 items-center gap-2 md:mt-4 md:grid-cols-[1fr_auto]">
        <button type="button" onClick={onToggle} className={cn("inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition md:min-h-11 md:gap-2 md:px-4 md:text-sm", isAdded ? "border border-black/10 bg-white/72 text-[#111] hover:bg-white" : "ink-button shine-layer relative overflow-hidden bg-[#111] text-white hover:bg-[#23252a]")}>
          {isAdded ? <Check size={15} /> : <Plus size={15} />} {isAdded ? t.added : t.add}
        </button>
        <Link href={`/skills/${skill.slug}`} onClick={() => track("skill_open", { slug: skill.slug, source: "catalog_card" })} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white/62 px-3 text-xs font-semibold text-[#111] transition hover:bg-white md:min-h-11 md:gap-2 md:px-4 md:text-sm">
          {t.details} <ArrowRight size={15} />
        </Link>
      </div>
    </motion.article>
  );
}

function CollectionShelf({ collection, index, locale }: { collection: { title: string; why: string; skills: Skill[] }; index: number; locale: "en" | "ru" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: index * 0.04 }} className="group min-w-[285px] max-w-[285px] rounded-[26px] border border-black/10 bg-white/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_14px_42px_rgba(30,35,45,.045)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/66 md:min-w-[360px] md:max-w-[360px]">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold leading-tight text-[#111]">{collection.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#7b8392]">{collection.why}</p>
        </div>
        <span className="rounded-full border border-black/10 bg-white/64 px-2.5 py-1 text-xs font-bold text-[#7b8392]">{collection.skills.length}</span>
      </div>
      <div className="grid gap-1.5">
        {collection.skills.map((skill) => (
          <Link key={skill.slug} href={`/skills/${skill.slug}`} onClick={() => track("skill_open", { slug: skill.slug, source: "collection_shelf" })} className="flex items-center justify-between gap-3 rounded-[16px] px-2.5 py-2 transition hover:bg-white/72">
            <span className="min-w-0 truncate text-sm font-semibold text-[#111]"><span className="mr-2">{skill.emoji}</span>{skillTitle(skill, locale)}</span>
            <span className="shrink-0 text-xs font-bold text-[#8e95a3]">{skill.score}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function SkillRow({ skill, index, locale, t, isAdded, onToggle }: { skill: Skill; index: number; locale: "en" | "ru"; t: typeof copy.en | typeof copy.ru; isAdded: boolean; onToggle: () => void }) {
  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: Math.min(index * 0.01, 0.1) }} className="pearl-surface rounded-[22px] p-3 md:p-4">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold"><span className="mr-2 text-lg">{skill.emoji}</span>{skillTitle(skill, locale)}</h2>
          <p className="line-clamp-2 mt-1 text-sm leading-5 text-[#5f6470]">{skillSummary(skill, locale)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold text-[#5f6470]"><span className="rounded-full bg-[#f2f3f0] px-2.5 py-1">{categoryLabels[locale][skill.category]}</span><span className="rounded-full border border-black/10 bg-white/52 px-2.5 py-1">{skill.compatibility[0]}</span></div>
        </div>
        <div className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs font-bold text-[#111]">{skill.score}</div>
        <button type="button" onClick={onToggle} className={cn("hidden min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition md:inline-flex", isAdded ? "border border-black/10 bg-white/62 text-[#111] hover:bg-white" : "ink-button bg-[#111] text-white hover:bg-[#23252a]")}>{isAdded ? <Check size={15} /> : <Plus size={15} />} {isAdded ? t.added : t.add}</button>
        <Link href={`/skills/${skill.slug}`} onClick={() => track("skill_open", { slug: skill.slug, source: "catalog_row" })} className="hidden min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/62 px-4 text-sm font-semibold text-[#111] transition hover:bg-white md:inline-flex">{t.details}</Link>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 md:hidden">
        <button type="button" onClick={onToggle} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold", isAdded ? "border border-black/10 bg-white/62 text-[#111]" : "ink-button bg-[#111] text-white")}>{isAdded ? <Check size={15} /> : <Plus size={15} />} {isAdded ? t.added : t.add}</button>
        <Link href={`/skills/${skill.slug}`} onClick={() => track("skill_open", { slug: skill.slug, source: "catalog_row" })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/62 px-3 text-sm font-semibold text-[#111]">{t.details}</Link>
      </div>
    </motion.article>
  );
}

function SkillPackPanel(props: { open: boolean; onClose: () => void; t: typeof copy.en | typeof copy.ru; locale: "en" | "ru"; selectedSkills: Skill[]; removeSkill: (slug: string) => void; clear: () => void; generatePrompt: () => void; isGenerating: boolean; error: string; notice: string; lastPackUrl: string }) {
  const { open, onClose, t, locale, selectedSkills } = props;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#111]/18 backdrop-blur-sm" onClick={onClose}>
          <motion.aside initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="skill-pack-panel pearl-surface absolute bottom-0 right-0 top-auto flex max-h-[84vh] w-full origin-bottom flex-col rounded-t-[34px] p-5 shadow-[0_30px_100px_rgba(30,35,45,.18)] md:bottom-5 md:right-5 md:top-5 md:max-h-none md:w-[420px] md:origin-right md:rounded-[34px]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8e95a3]">{selectedSkills.length} {t.selected}</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#111]">{t.basket}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label={t.close} className="grid size-10 shrink-0 place-items-center rounded-full border border-black/10 bg-white/70 text-[#7b8392] transition hover:bg-white hover:text-[#111]"><X size={18} /></button>
            </div>

            {(props.error || props.notice) && <div className={cn("mb-3 rounded-[18px] border px-4 py-3 text-sm font-semibold", props.error ? "border-red-500/20 bg-red-50/70 text-red-700" : "border-black/10 bg-white/64 text-[#5f6470]")}>{props.error || props.notice}</div>}

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {selectedSkills.length === 0 ? (
                <div className="grid min-h-56 place-items-center rounded-[26px] border border-black/10 bg-white/48 p-6 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-white/70 text-[#7b8392]"><PackageCheck size={20} /></div>
                    <p className="text-lg font-semibold text-[#111]">{t.noSkills}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#5f6470]">{t.noSkillsText}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  {selectedSkills.map((skill) => (
                    <div key={skill.slug} className="flex items-center gap-3 rounded-[20px] border border-black/10 bg-white/54 px-3 py-2.5">
                      <span className="text-xl">{skill.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#111]">{skillTitle(skill, locale)}</p>
                        <p className="text-xs font-semibold text-[#8e95a3]">{categoryLabels[locale][skill.category]}</p>
                      </div>
                      <button type="button" onClick={() => props.removeSkill(skill.slug)} aria-label={`${t.remove}: ${skillTitle(skill, locale)}`} className="grid size-8 shrink-0 place-items-center rounded-full border border-black/10 bg-white/64 text-[#7b8392] transition hover:bg-white hover:text-[#111]"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-black/10 pt-4 pb-[max(env(safe-area-inset-bottom),0px)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <button type="button" onClick={props.clear} disabled={!selectedSkills.length || props.isGenerating} className="rounded-full border border-black/10 bg-white/58 px-4 py-2 text-sm font-bold text-[#5f6470] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">{t.clearAll}</button>
                {props.lastPackUrl && <a href={props.lastPackUrl} className="rounded-full border border-black/10 bg-white/58 px-4 py-2 text-sm font-bold text-[#111] transition hover:bg-white">{t.openTelegram}</a>}
              </div>
              <button type="button" onClick={props.generatePrompt} disabled={props.isGenerating || !selectedSkills.length} className="ink-button shine-layer relative inline-flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#111] px-5 text-sm font-semibold text-white transition hover:bg-[#23252a] disabled:cursor-not-allowed disabled:opacity-45">
                {props.isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {props.isGenerating ? `${t.generatePrompt}...` : t.generatePrompt}
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
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
