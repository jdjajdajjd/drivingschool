import type { Metadata } from "next";
import { SimplePage } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "Submit Skill",
  description: "Submit a practical skill for Codex Skills.",
  alternates: { canonical: "/submit" },
  openGraph: {
    title: "Submit Skill — Codex Skills",
    description: "Submit a practical skill for Codex Skills.",
    url: "/submit",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Codex Skills" }],
  },
};

export default function SubmitPage() {
  return (
    <SimplePage content={{
      en: {
        eyebrow: "Submit Skill",
        title: "Send a useful workflow.",
        summary: "Submissions should be practical, inspectable, and easy to adapt.",
        blocks: [
          { type: "p", text: "Good skills solve a narrow problem clearly. They should explain when to use them, what files or tools they touch, and any setup needed before running." },
          { type: "h2", text: "Submission checklist" },
          { type: "ul", items: ["Clear title and short summary.", "Compatibility notes for Codex, ChatGPT, Claude, or local agents.", "Install or copy command.", "Examples and practical use cases.", "Source link or repository path."] },
          { type: "command", label: "Command", command: "codex skills submit ./my-skill", copyLabel: "Copy command" },
        ],
      },
      ru: {
        eyebrow: "Отправить skill",
        title: "Предложите полезный workflow.",
        summary: "Заявка должна быть практичной, проверяемой и простой для адаптации.",
        blocks: [
          { type: "p", text: "Хороший skill решает узкую задачу понятно. В нём должно быть ясно, когда его использовать, какие файлы или инструменты он затрагивает и какая настройка нужна перед запуском." },
          { type: "h2", text: "Что указать" },
          { type: "ul", items: ["Понятное название и короткое описание.", "Совместимость с Codex, ChatGPT, Claude или локальными агентами.", "Команда установки или копирования.", "Примеры и реальные сценарии.", "Ссылка на источник или путь к репозиторию."] },
          { type: "command", label: "Команда", command: "codex skills submit ./my-skill", copyLabel: "Скопировать команду" },
        ],
      },
    }} />
  );
}
