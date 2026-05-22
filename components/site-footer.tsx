"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { useLocale } from "@/components/locale-toggle";
import { telegramBotUrl } from "@/lib/site-config";

const copy = {
  en: {
    text: "Curated skills for coding agents. Practical workflows for Codex, ChatGPT, Claude, and local agent setups.",
    telegram: "Telegram bot",
    links: [
      ["Catalog", "/#catalog"],
      ["About", "/about"],
      ["Submit Skill", "/submit"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
  ru: {
    text: "Подборка skills для Codex и AI-агентов. Практичные workflows для разработки, тестов, документации и деплоя.",
    telegram: "Telegram bot",
    links: [
      ["Каталог", "/#catalog"],
      ["О проекте", "/about"],
      ["Отправить skill", "/submit"],
      ["Privacy", "/privacy"],
      ["Условия", "/terms"],
    ],
  },
} as const;

export function SiteFooter() {
  const { locale } = useLocale();
  const t = copy[locale];

  return (
    <footer className="mx-auto w-full max-w-7xl px-5 pb-10 pt-14 sm:px-8">
      <div className="codex-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-xl text-sm leading-6 text-[#5f6470]">{t.text}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {t.links.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full border border-black/10 bg-white/50 px-4 py-2 text-sm font-semibold text-[#5f6470] transition hover:bg-white hover:text-[#111]">
                {label}
              </Link>
            ))}
            <a href={telegramBotUrl("catalog")} className="inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#23252a]">
              <Send size={15} /> {t.telegram}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
