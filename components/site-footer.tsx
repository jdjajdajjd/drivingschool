import Link from "next/link";
import { Send } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { telegramBotUrl } from "@/lib/site-config";

const links = [
  ["Catalog", "/#catalog"],
  ["About", "/about"],
  ["Submit Skill", "/submit"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-5 pb-10 pt-14 sm:px-8">
      <div className="codex-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-xl text-sm leading-6 text-[#5f6470]">
              Curated skills for coding agents. Practical workflows for Codex, ChatGPT, Claude, and local agent setups.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full border border-black/10 bg-white/50 px-4 py-2 text-sm font-semibold text-[#5f6470] transition hover:bg-white hover:text-[#111]">
                {label}
              </Link>
            ))}
            <a href={telegramBotUrl("catalog")} className="inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#23252a]">
              <Send size={15} /> Telegram bot
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
