import type { Metadata } from "next";
import { SimplePage } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "Terms / Disclaimer",
  description: "Terms and disclaimer for Codex Skills.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms / Disclaimer — Codex Skills",
    description: "Terms and disclaimer for Codex Skills.",
    url: "/terms",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Codex Skills" }],
  },
};

export default function TermsPage() {
  return (
    <SimplePage content={{
      en: {
        eyebrow: "Terms / Disclaimer",
        title: "Use skills with review.",
        summary: "Codex Skills is a curated catalog, not a guarantee that every workflow fits every codebase.",
        blocks: [
          { type: "p", text: "Skills can change files, run tools, or guide agents through complex work. Review instructions and commands before using them in sensitive projects." },
          { type: "h2", text: "No warranty" },
          { type: "p", text: "The catalog is provided as-is. Test workflows in your own environment and verify results before shipping." },
          { type: "h2", text: "Security" },
          { type: "p", text: "Do not paste secrets into untrusted tools or repositories. Prefer inspectable sources and keep agent permissions scoped to the task." },
        ],
      },
      ru: {
        eyebrow: "Условия",
        title: "Используйте skills с проверкой.",
        summary: "Codex Skills — это curated catalog, а не гарантия, что каждый workflow подойдёт любому проекту.",
        blocks: [
          { type: "p", text: "Skills могут менять файлы, запускать инструменты или вести агента через сложную работу. Перед использованием в чувствительных проектах проверяйте инструкции и команды." },
          { type: "h2", text: "Без гарантий" },
          { type: "p", text: "Каталог предоставляется как есть. Тестируйте workflows в своём окружении и проверяйте результат перед релизом." },
          { type: "h2", text: "Безопасность" },
          { type: "p", text: "Не вставляйте secrets в непроверенные tools или repositories. Предпочитайте проверяемые источники и ограничивайте permissions агента задачей." },
        ],
      },
    }} />
  );
}
