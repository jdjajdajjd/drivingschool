import type { Metadata } from "next";
import { SimplePage } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy notes for Codex Skills.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy — Codex Skills",
    description: "Privacy notes for Codex Skills.",
    url: "/privacy",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Codex Skills" }],
  },
};

export default function PrivacyPage() {
  return (
    <SimplePage content={{
      en: {
        eyebrow: "Privacy",
        title: "Simple privacy notes.",
        summary: "Codex Skills is a static catalog MVP with no account system.",
        blocks: [
          { type: "p", text: "This version does not include user accounts, payments, or a backend database for visitors. Basic hosting logs may be processed by Cloudflare Pages as part of serving the site." },
          { type: "h2", text: "Clipboard actions" },
          { type: "p", text: "Copy buttons only write the selected install command to your clipboard after you click them." },
          { type: "h2", text: "External links" },
          { type: "p", text: "Telegram, source links, and future skill repositories are external destinations. Their own privacy practices apply once you leave this site." },
        ],
      },
      ru: {
        eyebrow: "Privacy",
        title: "Коротко о приватности.",
        summary: "Codex Skills сейчас работает как статический каталог без аккаунтов.",
        blocks: [
          { type: "p", text: "В этой версии нет пользовательских аккаунтов, платежей или backend-базы для посетителей. Базовые hosting logs могут обрабатываться Cloudflare Pages для работы сайта." },
          { type: "h2", text: "Clipboard" },
          { type: "p", text: "Кнопки копирования записывают выбранную команду в буфер обмена только после вашего клика." },
          { type: "h2", text: "Внешние ссылки" },
          { type: "p", text: "Telegram, source links и будущие skill repositories являются внешними страницами. После перехода действуют их собственные правила." },
        ],
      },
    }} />
  );
}
