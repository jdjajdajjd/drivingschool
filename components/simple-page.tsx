import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";

export function SimplePage({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[840px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.9),rgba(217,221,229,.28)_45%,transparent_70%)] blur-3xl" />
        <div className="contour-lines absolute inset-x-0 top-36 h-96 opacity-45" />
      </div>
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/58 px-4 py-2.5 text-sm font-semibold text-[#5f6470] shadow-[0_14px_42px_rgba(30,35,45,.06)] backdrop-blur-xl transition hover:bg-white hover:text-[#111]">
          <ArrowLeft size={16} /> Catalog
        </Link>
      </nav>
      <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-display text-[clamp(4rem,9vw,8.6rem)] font-semibold leading-[0.9] tracking-normal">
          {title}
        </h1>
        <p className="mt-8 max-w-2xl text-xl leading-8 text-[#5f6470] sm:text-2xl sm:leading-9">{summary}</p>
      </section>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-14 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="codex-panel rounded-[34px] p-6 sm:p-8">{children}</div>
        <aside className="codex-panel h-fit rounded-[34px] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8e95a3]">Telegram</p>
          <h2 className="mt-3 font-display text-3xl font-semibold">Updates and submissions.</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f6470]">Use the bot for quick notes, skill ideas, and catalog updates.</p>
          <a href="https://t.me/vroomleadsbot" className="ink-button mt-6 inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#23252a]">
            <Send size={16} /> Open Telegram bot
          </a>
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}

export function TextStack({ children }: { children: ReactNode }) {
  return <div className="space-y-5 text-base leading-8 text-[#5f6470] [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-[#111] [&_p]:max-w-3xl [&_ul]:max-w-3xl [&_ul]:space-y-2">{children}</div>;
}
