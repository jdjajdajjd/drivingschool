import type { Metadata } from "next";
import { SimplePage } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "About",
  description: "About Codex Skills, a curated catalog of practical workflows for coding agents.",
};

export default function AboutPage() {
  return (
    <SimplePage content={{
      en: {
        eyebrow: "About",
        title: "A careful catalog for agent workflows.",
        summary: "Codex Skills collects practical skills for Codex, ChatGPT, Claude, and AI coding agents.",
        blocks: [
          { type: "p", text: "Codex Skills is built as a working catalog, not a generic tools directory. Each entry is selected for clear use, readable setup, and practical value in day-to-day engineering work." },
          { type: "h2", text: "What belongs here" },
          { type: "p", text: "Skills that help agents design, build, test, document, research, deploy, or review software with less friction. Short instructions, inspectable sources, and calm defaults matter more than novelty." },
          { type: "h2", text: "Brand tone" },
          { type: "p", text: "Useful skills, selected carefully. Browse, install, adapt." },
        ],
      },
      ru: {
        eyebrow: "О проекте",
        title: "Аккуратный каталог agent workflows.",
        summary: "Codex Skills собирает практичные skills для Codex, ChatGPT, Claude и AI-агентов.",
        blocks: [
          { type: "p", text: "Codex Skills сделан как рабочий каталог, а не очередная директория инструментов. Каждая карточка отобрана за понятную пользу, читаемую настройку и практичность в ежедневной инженерной работе." },
          { type: "h2", text: "Что сюда подходит" },
          { type: "p", text: "Skills, которые помогают агентам проектировать, писать код, тестировать, документировать, исследовать, деплоить или ревьюить софт без лишнего трения. Важнее всего короткие инструкции, проверяемые источники и спокойные defaults." },
          { type: "h2", text: "Тон" },
          { type: "p", text: "Полезные skills, аккуратно отобранные. Найти, получить, адаптировать." },
        ],
      },
    }} />
  );
}
