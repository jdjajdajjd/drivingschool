"use client";

import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect } from "react";
import { CopyButton } from "@/components/copy-button";
import { Wordmark } from "@/components/brand";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { SiteFooter } from "@/components/site-footer";
import { telegramBotUrl } from "@/lib/site-config";
import type { Locale } from "@/lib/skills";
import { track } from "@/lib/analytics";

type TextBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "command"; label: string; command: string; copyLabel: string };

export type SimplePageContent = Record<Locale, {
  eyebrow: string;
  title: string;
  summary: string;
  blocks: TextBlock[];
}>;

const sideCopy = {
  en: {
    catalog: "Catalog",
    telegram: "Telegram",
    title: "Updates and submissions.",
    text: "Use the bot for skill requests, quick notes, and catalog updates.",
    open: "Open Telegram bot",
  },
  ru: {
    catalog: "Каталог",
    telegram: "Telegram",
    title: "Обновления и заявки.",
    text: "Используйте бота для получения skills, коротких заметок и обновлений каталога.",
    open: "Открыть Telegram bot",
  },
} as const;

export function SimplePage({ content }: { content: SimplePageContent }) {
  const { locale, setLocale } = useLocale();
  const page = content[locale];
  const t = sideCopy[locale];

  useEffect(() => {
    track("page_view", { page: window.location.pathname });
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[840px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.9),rgba(217,221,229,.28)_45%,transparent_70%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-36 h-96 opacity-45" />
      </div>
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          <LocaleToggle locale={locale} setLocale={setLocale} />
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/58 px-4 py-2.5 text-sm font-semibold text-[#5f6470] shadow-[0_14px_42px_rgba(30,35,45,.06)] backdrop-blur-xl transition hover:bg-white hover:text-[#111]">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">{t.catalog}</span>
          </Link>
        </div>
      </nav>
      <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{page.eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-display text-[clamp(4rem,9vw,8.6rem)] font-semibold leading-[0.9] tracking-normal">
          {page.title}
        </h1>
        <p className="mt-8 max-w-2xl text-xl leading-8 text-[#5f6470] sm:text-2xl sm:leading-9">{page.summary}</p>
      </section>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-14 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="codex-panel rounded-[34px] p-6 sm:p-8"><TextStack blocks={page.blocks} /></div>
        <aside className="codex-panel h-fit rounded-[34px] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{t.telegram}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold">{t.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f6470]">{t.text}</p>
          <a href={telegramBotUrl("catalog")} onClick={() => track("telegram_click", { source: "simple_page", payload: "catalog" })} className="ink-button mt-6 inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#23252a]">
            <Send size={16} /> {t.open}
          </a>
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}

export function TextStack({ blocks }: { blocks: TextBlock[] }) {
  return (
    <div className="space-y-5 text-base leading-8 text-[#5f6470] [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-[#111] [&_p]:max-w-3xl [&_ul]:max-w-3xl [&_ul]:space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "h2") return <h2 key={index}>{block.text}</h2>;
        if (block.type === "ul") return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        if (block.type === "command") {
          return (
            <div key={index} className="mt-8 rounded-[26px] bg-[#111] p-4 text-white">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/52">{block.label}</p>
              <code className="block overflow-x-auto whitespace-nowrap rounded-2xl bg-white/8 px-4 py-3 text-sm text-white/92">{block.command}</code>
              <div className="mt-4"><CopyButton value={block.command} label={block.copyLabel} onCopied={() => track("copy_command", { source: "simple_page" })} /></div>
            </div>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
