"use client";

import { AnimatePresence, motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, Command, ExternalLink, Search, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, skills, type Category, type Skill } from "@/lib/skills";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { Wordmark } from "@/components/brand";

const all = "All";

const smooth = [0.22, 1, 0.36, 1] as const;

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: smooth } },
};

export function CatalogExperience() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Category | typeof all>(all);
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, -85]);
  const glow = useTransform(scrollYProgress, [0, 0.55, 1], [1, 0.62, 0.42]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((skill) => {
      const categoryMatch = active === all || skill.category === active;
      const textMatch = !q || [skill.title, skill.summary, skill.description, skill.category, skill.source, ...skill.tags, ...skill.compatibility]
        .join(" ")
        .toLowerCase()
        .includes(q);
      return categoryMatch && textMatch;
    });
  }, [query, active]);

  const featured = skills.filter((skill) => skill.score >= 90).slice(0, 4);

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
          {['Catalog', 'Picks', 'Submit'].map((item) => (
            <a key={item} href={item === 'Catalog' ? '#catalog' : item === 'Picks' ? '#picks' : '#submit'} className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6470] transition hover:bg-white hover:text-[#111]">
              {item}
            </a>
          ))}
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-12 lg:pt-0">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.11 } } }} className="relative z-10">
          <motion.div variants={fade} className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/62 px-4 py-2 text-sm font-semibold text-[#5f6470] shadow-[0_14px_45px_rgba(30,35,45,.06)] backdrop-blur-xl">
            <Sparkles size={15} className="text-[#7b8392]" /> Curated skills for coding agents
          </motion.div>
          <motion.h1 variants={fade} className="font-display text-[clamp(4.3rem,9.5vw,9.7rem)] font-semibold leading-[0.86] tracking-normal">
            Pearl <span className="chrome-text">Index</span>
          </motion.h1>
          <motion.p variants={fade} className="mt-8 max-w-2xl text-balance text-xl leading-8 text-[#5f6470] sm:text-2xl sm:leading-9">
            A quiet digital boutique for practical agent skills. Browse, install, adapt.
          </motion.p>

          <motion.div variants={fade} className="pearl-panel mt-10 max-w-3xl rounded-[32px] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex min-h-16 flex-1 items-center rounded-[24px] bg-white/72 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,.85)]">
                <Search size={22} className="mr-3 text-[#8e95a3]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search skills, sources, workflows..."
                  className="w-full bg-transparent text-base font-medium text-[#111] outline-none placeholder:text-[#8e95a3] sm:text-lg"
                />
                <span className="hidden items-center gap-1 rounded-full border border-black/10 bg-[#f7f7f4] px-2.5 py-1 text-xs font-semibold text-[#8e95a3] sm:flex">
                  <Command size={12} /> K
                </span>
              </label>
              <a href="#catalog" className="ink-button inline-flex min-h-16 items-center justify-center gap-2 rounded-[24px] bg-[#111] px-6 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(17,17,17,.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#23252a] focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50">
                Explore catalog <ArrowRight size={17} />
              </a>
            </div>
          </motion.div>

          <motion.div variants={fade} className="mt-7 flex flex-wrap gap-3 text-sm text-[#5f6470]">
            {['Clean tools', 'Useful workflows', 'No dark neon'].map((item) => (
              <span key={item} className="rounded-full border border-black/10 bg-white/48 px-4 py-2 backdrop-blur-xl">{item}</span>
            ))}
          </motion.div>
        </motion.div>

        <HeroObject featured={featured} />
      </section>

      <section id="picks" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-7 flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">Editor picks</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Useful from the first run.</h2>
          </div>
          <p className="hidden max-w-sm text-sm leading-6 text-[#5f6470] md:block">A short shelf of skills that make agent work cleaner without adding ceremony.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {featured.map((skill, index) => <FeatureTile key={skill.slug} skill={skill} index={index} />)}
        </div>
      </section>

      <section id="catalog" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
        <div className="pearl-panel overflow-hidden rounded-[36px] p-4 sm:p-6 lg:p-8">
          <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]"><SlidersHorizontal size={15} /> Catalog</div>
              <h2 className="font-display text-4xl font-semibold sm:text-5xl">Browse the shelf.</h2>
            </div>
            <div className="relative max-w-xl flex-1 rounded-full border border-black/10 bg-white/68 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8e95a3]" size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent pl-8 text-sm font-semibold outline-none placeholder:text-[#8e95a3]" placeholder="Filter instantly" />
            </div>
          </div>

          <div className="scrollbar-hide -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-2">
            {[all, ...categories].map((category) => {
              const selected = active === category;
              return (
                <button key={category} onClick={() => setActive(category as Category | typeof all)} className={cn("relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50", selected ? "ink-button text-white" : "border border-black/10 bg-white/58 text-[#5f6470] hover:bg-white hover:text-[#111]") }>
                  {selected && <motion.span layoutId="active-pill" className="absolute inset-0 rounded-full bg-[#111] shadow-[0_14px_36px_rgba(17,17,17,.16)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative">{category}</span>
                </button>
              );
            })}
          </div>

          <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((skill, index) => <SkillCard key={skill.slug} skill={skill} index={index} />)}
            </AnimatePresence>
          </motion.div>
          {filtered.length === 0 && <div className="rounded-[28px] border border-dashed border-black/10 bg-white/54 p-10 text-center text-[#5f6470]">No matches. Try a source, category, or workflow name.</div>}
        </div>
      </section>

      <section id="submit" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <div className="pearl-panel copy-grid relative overflow-hidden rounded-[36px] p-8 sm:p-12">
          <div className="absolute right-8 top-8 hidden size-28 rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff,#d9dde5_42%,#8fb7ff_100%)] opacity-70 shadow-[0_20px_70px_rgba(143,183,255,.22)] md:block" />
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">Submit</p>
            <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">A clean place for useful workflows.</h2>
            <p className="mt-4 text-lg leading-8 text-[#5f6470]">Pearl Index favors skills that are clear, practical, easy to inspect, and calm in daily use.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <CopyButton value="codex skills submit ./my-skill" label="Copy submit command" />
              <a href="mailto:skills@pearl-index.local" className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/56 px-4 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-white">
                Source link <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroObject({ featured }: { featured: Skill[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.25, ease: smooth }} className="relative z-10 mt-16 min-h-[520px] lg:mt-0">
      <div className="absolute left-8 top-2 h-[410px] w-[410px] rounded-full bg-[conic-gradient(from_180deg,#fff,#d9dde5,#8fb7ff,#f7f7f4,#c9c2ff,#fff)] opacity-60 blur-2xl" />
      <motion.div animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="pearl-panel relative mx-auto max-w-[520px] rounded-[42px] p-5">
        <div className="rounded-[32px] border border-black/10 bg-[linear-gradient(145deg,rgba(255,255,255,.72),rgba(242,243,240,.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#5f6470]"><ShieldCheck size={16} /> Curated shelf</div>
            <div className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{skills.length} skills</div>
          </div>
          <div className="space-y-3">
            {featured.map((skill, index) => (
              <motion.div key={skill.slug} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + index * 0.08 }} className="group rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-[0_12px_36px_rgba(30,35,45,.06)] transition duration-300 hover:-translate-y-1 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold">{skill.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#5f6470]">{skill.summary}</p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-[#f7f7f4] px-2.5 py-1 text-xs font-bold text-[#7b8392]">{skill.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
      <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="pearl-panel absolute bottom-8 left-0 hidden rounded-[28px] p-4 lg:block">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e95a3]">Brand line</div>
        <div className="mt-1 font-display text-2xl font-semibold">Clean tools, useful workflows.</div>
      </motion.div>
    </motion.div>
  );
}

function FeatureTile({ skill, index }: { skill: Skill; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.06, duration: 0.55 }} className="group rounded-[28px] border border-black/10 bg-white/58 p-5 shadow-[0_18px_55px_rgba(30,35,45,.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/82">
      <div className="mb-5 flex items-center justify-between">
        <span className="ink-button rounded-full bg-[#111] px-3 py-1 text-xs font-bold text-white">{skill.category}</span>
        <span className="text-sm font-bold text-[#7b8392]">{skill.score}</span>
      </div>
      <h3 className="font-display text-3xl font-semibold">{skill.title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#5f6470]">{skill.summary}</p>
    </motion.div>
  );
}

function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  return (
    <motion.article layout initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.34, delay: Math.min(index * 0.025, 0.18) }} whileHover={{ y: -6, rotateX: 1.5, rotateY: -1.5 }} className="group rounded-[30px] border border-black/10 bg-white/62 p-5 shadow-[0_20px_60px_rgba(30,35,45,.07)] backdrop-blur-xl transition-colors duration-300 hover:bg-white/86">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f2f3f0] px-3 py-1 text-xs font-bold text-[#5f6470]">{skill.category}</span>
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-bold text-[#7b8392]">{skill.marker}</span>
          </div>
          <h3 className="font-display text-3xl font-semibold tracking-normal">{skill.title}</h3>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_20%,#fff,#d9dde5_58%,#b8c0cc)] text-sm font-black text-[#111] shadow-[inset_0_1px_8px_rgba(255,255,255,.82)]">{skill.score}</div>
      </div>
      <p className="min-h-14 text-sm leading-6 text-[#5f6470]">{skill.summary}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {skill.tags.map((tag) => <span key={tag} className="rounded-full border border-black/10 bg-white/42 px-3 py-1 text-xs font-semibold text-[#5f6470]">{tag}</span>)}
      </div>
      <div className="mt-6 grid gap-2 rounded-[22px] border border-black/10 bg-[#f7f7f4]/62 p-3 text-xs font-semibold text-[#5f6470]">
        <div className="flex items-center justify-between gap-3"><span>Compatibility</span><span className="text-right text-[#111]">{skill.compatibility.join(", ")}</span></div>
        <div className="flex items-center justify-between gap-3"><span>Setup</span><span className="text-right text-[#111]">{skill.setup}</span></div>
        <div className="flex items-center justify-between gap-3"><span>Source</span><span className="text-right text-[#111]">{skill.source}</span></div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <Link href={`/skills/${skill.slug}`} className="ink-button inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#23252a]">
          Open <ArrowRight size={15} />
        </Link>
        <CopyButton value={skill.install} label="Copy" />
      </div>
    </motion.article>
  );
}
