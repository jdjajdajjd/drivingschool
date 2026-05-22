"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/skills";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("codex-skills-locale");
    if (saved === "ru" || saved === "en") {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    }
    const syncLocale = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if (next === "ru" || next === "en") {
        setLocaleState(next);
        document.documentElement.lang = next;
      }
    };
    window.addEventListener("codex-skills-locale", syncLocale);
    return () => window.removeEventListener("codex-skills-locale", syncLocale);
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem("codex-skills-locale", next);
    document.documentElement.lang = next;
    window.dispatchEvent(new CustomEvent("codex-skills-locale", { detail: next }));
  }

  return { locale, setLocale };
}

export function LocaleToggle({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div role="group" className="relative inline-flex items-center rounded-full border border-black/10 bg-white/58 p-1 shadow-[0_14px_42px_rgba(30,35,45,.06)] backdrop-blur-xl" aria-label="Language switcher">
      {(["en", "ru"] as Locale[]).map((item) => {
        const active = locale === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            className={`relative min-w-11 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${active ? "ink-button text-white" : "text-[#7b8392] hover:text-[#111]"}`}
            aria-pressed={active}
            aria-label={`Switch language to ${item.toUpperCase()}`}
          >
            {active && <motion.span layoutId="locale-pill" className="absolute inset-0 rounded-full bg-[#111]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{item}</span>
          </button>
        );
      })}
    </div>
  );
}
