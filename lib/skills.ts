export type Category =
  | "Frontend"
  | "Backend"
  | "Design"
  | "Testing"
  | "Security"
  | "Docs"
  | "Automation"
  | "Research"
  | "Data"
  | "Productivity"
  | "Prompting"
  | "Deployment";

export type Difficulty = "Easy" | "Medium" | "Advanced";
export type Risk = "Low" | "Medium" | "High";
export type Compatibility = "Codex" | "ChatGPT" | "Claude" | "Universal";

export type Skill = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: Category;
  emoji: string;
  tags: string[];
  compatibility: Compatibility[];
  source: string;
  install: string;
  score: number;
  popularity: number;
  addedAt: string;
  featured: boolean;
  difficulty: Difficulty;
  risk: Risk;
  hasScripts: boolean;
  free: boolean;
  setup: "Zero config" | "Light setup" | "Scripted" | "Requires keys";
  marker: "Safe" | "Script" | "Advanced";
  examples: string[];
  useCases: string[];
  ru: {
    title: string;
    summary: string;
    description: string;
    tags: string[];
    examples: string[];
    useCases: string[];
  };
};

export type Locale = "en" | "ru";

export const categories: Category[] = [
  "Frontend",
  "Backend",
  "Design",
  "Testing",
  "Security",
  "Docs",
  "Automation",
  "Research",
  "Data",
  "Productivity",
  "Prompting",
  "Deployment",
];

export const compatibilityOptions: Compatibility[] = ["Codex", "ChatGPT", "Claude", "Universal"];
export const difficultyOptions: Difficulty[] = ["Easy", "Medium", "Advanced"];
export const riskOptions: Risk[] = ["Low", "Medium", "High"];

export const skills: Skill[] = [
  {
    slug: "frontend-design",
    title: "Frontend Design",
    summary: "Production-grade interfaces with a clear visual point of view.",
    description:
      "A design-focused workflow for building polished React, HTML, and app surfaces that feel intentional instead of templated.",
    category: "Design",
    emoji: "◇",
    tags: ["UI", "visual systems", "React"],
    compatibility: ["Codex", "Claude", "ChatGPT"],
    source: "System skill",
    install: "codex skills install frontend-design",
    score: 98,
    popularity: 980,
    addedAt: "2026-05-10",
    featured: true,
    difficulty: "Medium",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Zero config",
    marker: "Safe",
    examples: ["Redesign a product dashboard", "Create a refined landing page", "Polish a component library"],
    useCases: ["Brand-led UI", "High-touch prototypes", "Design QA before shipping"],
    ru: {
      title: "Frontend Design",
      summary: "Интерфейсы production-уровня с ясным визуальным характером.",
      description: "Дизайн-ориентированный workflow для React, HTML и app surfaces, которые выглядят собранно, а не шаблонно.",
      tags: ["UI", "визуальные системы", "React"],
      examples: ["Переделать product dashboard", "Собрать утонченный landing page", "Отполировать component library"],
      useCases: ["Брендовый UI", "Прототипы высокого качества", "Design QA перед релизом"],
    },
  },
  {
    slug: "webapp-testing",
    title: "Webapp Testing",
    summary: "Browser checks, screenshots, and interaction tests for local apps.",
    description:
      "A pragmatic Playwright workflow for inspecting rendered pages, catching console errors, and verifying real user paths.",
    category: "Testing",
    emoji: "◌",
    tags: ["Playwright", "screenshots", "QA"],
    compatibility: ["Codex", "Claude"],
    source: "System skill",
    install: "codex skills install webapp-testing",
    score: 95,
    popularity: 910,
    addedAt: "2026-05-11",
    featured: true,
    difficulty: "Easy",
    risk: "Medium",
    hasScripts: true,
    free: true,
    setup: "Light setup",
    marker: "Script",
    examples: ["Capture mobile screenshots", "Test a checkout flow", "Find broken interactive states"],
    useCases: ["Visual QA", "Regression checks", "Local product reviews"],
    ru: {
      title: "Webapp Testing",
      summary: "Браузерные проверки, скриншоты и interaction tests для локальных приложений.",
      description: "Практичный Playwright workflow для проверки отрисованных страниц, console errors и реальных пользовательских сценариев.",
      tags: ["Playwright", "скриншоты", "QA"],
      examples: ["Снять mobile screenshots", "Проверить checkout flow", "Найти сломанные интерактивные состояния"],
      useCases: ["Visual QA", "Regression checks", "Локальные product reviews"],
    },
  },
  {
    slug: "openai-docs",
    title: "OpenAI Docs",
    summary: "Current official references for OpenAI APIs and models.",
    description:
      "Keeps agent answers grounded in official OpenAI documentation when choosing models, upgrading prompts, or wiring API features.",
    category: "Docs",
    emoji: "□",
    tags: ["API", "models", "official docs"],
    compatibility: ["Codex", "ChatGPT"],
    source: "System skill",
    install: "codex skills install openai-docs",
    score: 92,
    popularity: 780,
    addedAt: "2026-04-28",
    featured: true,
    difficulty: "Easy",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Zero config",
    marker: "Safe",
    examples: ["Pick a model for a coding tool", "Update a Responses API flow", "Check latest SDK guidance"],
    useCases: ["API planning", "Migration notes", "Documentation-backed answers"],
    ru: {
      title: "OpenAI Docs",
      summary: "Актуальные официальные материалы по OpenAI APIs и моделям.",
      description: "Удерживает ответы агента в рамках официальной документации OpenAI при выборе моделей, обновлении prompts и API-интеграций.",
      tags: ["API", "модели", "официальные docs"],
      examples: ["Выбрать модель для coding tool", "Обновить Responses API flow", "Проверить свежие SDK рекомендации"],
      useCases: ["API planning", "Migration notes", "Ответы с опорой на документацию"],
    },
  },
  {
    slug: "security-best-practices",
    title: "Security Best Practices",
    summary: "Framework-aware security review for JS, Python, and Go.",
    description:
      "A focused AppSec pass for common coding risks, secure defaults, dependency hygiene, and practical remediation steps.",
    category: "Security",
    emoji: "◈",
    tags: ["AppSec", "review", "secure defaults"],
    compatibility: ["Codex", "Claude", "ChatGPT"],
    source: "System skill",
    install: "codex skills install security-best-practices",
    score: 91,
    popularity: 720,
    addedAt: "2026-04-30",
    featured: true,
    difficulty: "Medium",
    risk: "Medium",
    hasScripts: false,
    free: true,
    setup: "Light setup",
    marker: "Advanced",
    examples: ["Review auth handlers", "Harden file uploads", "Audit API input validation"],
    useCases: ["Pre-release checks", "Secure refactors", "Risk-focused reviews"],
    ru: {
      title: "Security Best Practices",
      summary: "Security review с учетом framework для JS, Python и Go.",
      description: "Сфокусированный AppSec проход по типовым рискам, secure defaults, зависимостям и практичным исправлениям.",
      tags: ["AppSec", "review", "secure defaults"],
      examples: ["Проверить auth handlers", "Усилить file uploads", "Проверить input validation в API"],
      useCases: ["Pre-release checks", "Secure refactors", "Risk-focused reviews"],
    },
  },
  {
    slug: "cloudflare-deploy",
    title: "Cloudflare Deploy",
    summary: "Publish Workers, Pages, and full-stack apps with clean defaults.",
    description:
      "A deployment workflow for taking local web projects to Cloudflare, including configuration, build commands, and checks.",
    category: "Deployment",
    emoji: "◒",
    tags: ["Cloudflare", "deploy", "Pages"],
    compatibility: ["Codex"],
    source: "Local skill",
    install: "codex skills install cloudflare-deploy",
    score: 89,
    popularity: 700,
    addedAt: "2026-05-12",
    featured: true,
    difficulty: "Medium",
    risk: "High",
    hasScripts: true,
    free: true,
    setup: "Requires keys",
    marker: "Script",
    examples: ["Deploy a Next.js app", "Configure Wrangler", "Publish a Worker API"],
    useCases: ["Production previews", "Static sites", "Edge functions"],
    ru: {
      title: "Cloudflare Deploy",
      summary: "Публикация Workers, Pages и full-stack apps с чистыми defaults.",
      description: "Deployment workflow для вывода локальных web projects в Cloudflare: config, build commands и проверки.",
      tags: ["Cloudflare", "deploy", "Pages"],
      examples: ["Задеплоить Next.js app", "Настроить Wrangler", "Опубликовать Worker API"],
      useCases: ["Production previews", "Static sites", "Edge functions"],
    },
  },
  {
    slug: "skill-creator",
    title: "Skill Creator",
    summary: "Turn repeatable agent workflows into reusable skills.",
    description:
      "A structured authoring guide for creating skills with clear triggers, compact instructions, and useful local assets.",
    category: "Productivity",
    emoji: "✦",
    tags: ["authoring", "workflows", "agents"],
    compatibility: ["Codex"],
    source: "System skill",
    install: "codex skills install skill-creator",
    score: 88,
    popularity: 650,
    addedAt: "2026-05-08",
    featured: false,
    difficulty: "Easy",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Zero config",
    marker: "Safe",
    examples: ["Package a review workflow", "Create a design QA skill", "Document a deployment routine"],
    useCases: ["Team workflows", "Personal automation", "Agent memory"],
    ru: {
      title: "Skill Creator",
      summary: "Превращает повторяемые agent workflows в переиспользуемые skills.",
      description: "Структурный guide для создания skills с ясными triggers, компактными инструкциями и полезными локальными assets.",
      tags: ["authoring", "workflows", "agents"],
      examples: ["Упаковать review workflow", "Создать design QA skill", "Описать deployment routine"],
      useCases: ["Team workflows", "Personal automation", "Agent memory"],
    },
  },
  {
    slug: "data-canvas",
    title: "Data Canvas",
    summary: "Shape raw CSV or JSON into readable product-facing views.",
    description:
      "A lightweight data skill for profiling datasets, drafting schemas, and producing chart-ready structures without heavy tooling.",
    category: "Data",
    emoji: "▧",
    tags: ["CSV", "JSON", "charts"],
    compatibility: ["Codex", "ChatGPT", "Claude", "Universal"],
    source: "Curated pack",
    install: "codex skills install data-canvas",
    score: 84,
    popularity: 520,
    addedAt: "2026-04-24",
    featured: false,
    difficulty: "Easy",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Light setup",
    marker: "Safe",
    examples: ["Normalize a CSV export", "Draft a chart model", "Find malformed rows"],
    useCases: ["Internal tools", "Reports", "Product analytics"],
    ru: {
      title: "Data Canvas",
      summary: "Превращает raw CSV или JSON в читаемые product-facing views.",
      description: "Легкий data skill для профилирования datasets, черновиков schemas и chart-ready структур без тяжелого tooling.",
      tags: ["CSV", "JSON", "charts"],
      examples: ["Нормализовать CSV export", "Собрать chart model", "Найти malformed rows"],
      useCases: ["Internal tools", "Reports", "Product analytics"],
    },
  },
  {
    slug: "research-brief",
    title: "Research Brief",
    summary: "Compact source-backed briefs for technical decisions.",
    description:
      "A research workflow that favors primary sources, dated claims, and short decision notes that engineers can act on.",
    category: "Research",
    emoji: "◍",
    tags: ["sources", "briefs", "decisions"],
    compatibility: ["Codex", "ChatGPT"],
    source: "Curated pack",
    install: "codex skills install research-brief",
    score: 87,
    popularity: 560,
    addedAt: "2026-05-02",
    featured: false,
    difficulty: "Medium",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Zero config",
    marker: "Safe",
    examples: ["Compare two libraries", "Summarize a new API", "Prepare a build-vs-buy note"],
    useCases: ["Technical planning", "Vendor checks", "Architecture notes"],
    ru: {
      title: "Research Brief",
      summary: "Короткие source-backed briefs для технических решений.",
      description: "Research workflow, который предпочитает primary sources, датированные claims и короткие decision notes для инженеров.",
      tags: ["sources", "briefs", "decisions"],
      examples: ["Сравнить две библиотеки", "Кратко разобрать новый API", "Подготовить build-vs-buy note"],
      useCases: ["Technical planning", "Vendor checks", "Architecture notes"],
    },
  },
  {
    slug: "backend-routes",
    title: "Backend Routes",
    summary: "Small, reliable API endpoints with validation and tests.",
    description:
      "A backend implementation guide for focused route work, sane input parsing, and minimal-but-real coverage.",
    category: "Backend",
    emoji: "▣",
    tags: ["API", "validation", "tests"],
    compatibility: ["Codex", "Claude"],
    source: "Curated pack",
    install: "codex skills install backend-routes",
    score: 86,
    popularity: 610,
    addedAt: "2026-05-03",
    featured: false,
    difficulty: "Medium",
    risk: "Medium",
    hasScripts: true,
    free: true,
    setup: "Light setup",
    marker: "Script",
    examples: ["Add a REST endpoint", "Validate request bodies", "Write contract tests"],
    useCases: ["API slices", "Service cleanup", "Integration work"],
    ru: {
      title: "Backend Routes",
      summary: "Небольшие надежные API endpoints с validation и tests.",
      description: "Backend guide для аккуратной route work, нормального input parsing и минимального, но реального test coverage.",
      tags: ["API", "validation", "tests"],
      examples: ["Добавить REST endpoint", "Проверить request bodies", "Написать contract tests"],
      useCases: ["API slices", "Service cleanup", "Integration work"],
    },
  },
  {
    slug: "accessibility-pass",
    title: "Accessibility Pass",
    summary: "Practical accessibility checks for product UI.",
    description:
      "A compact review workflow for keyboard paths, contrast, labels, focus states, and responsive readability.",
    category: "Frontend",
    emoji: "◎",
    tags: ["a11y", "keyboard", "contrast"],
    compatibility: ["Codex", "ChatGPT", "Claude", "Universal"],
    source: "Curated pack",
    install: "codex skills install accessibility-pass",
    score: 90,
    popularity: 690,
    addedAt: "2026-05-05",
    featured: false,
    difficulty: "Easy",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Zero config",
    marker: "Safe",
    examples: ["Audit a settings page", "Fix focus rings", "Check mobile forms"],
    useCases: ["UI reviews", "Design systems", "Release polish"],
    ru: {
      title: "Accessibility Pass",
      summary: "Практичные accessibility checks для product UI.",
      description: "Компактный review workflow для keyboard paths, contrast, labels, focus states и responsive readability.",
      tags: ["a11y", "keyboard", "contrast"],
      examples: ["Проверить settings page", "Исправить focus rings", "Проверить mobile forms"],
      useCases: ["UI reviews", "Design systems", "Release polish"],
    },
  },
  {
    slug: "prompt-shaper",
    title: "Prompt Shaper",
    summary: "Tight prompts, reusable briefs, and calmer agent instructions.",
    description:
      "A prompting workflow for turning loose requests into concise task briefs, guardrails, and reusable instruction patterns.",
    category: "Prompting",
    emoji: "◐",
    tags: ["prompts", "briefs", "instructions"],
    compatibility: ["Codex", "ChatGPT", "Claude", "Universal"],
    source: "Curated pack",
    install: "codex skills install prompt-shaper",
    score: 85,
    popularity: 570,
    addedAt: "2026-05-13",
    featured: false,
    difficulty: "Easy",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Zero config",
    marker: "Safe",
    examples: ["Rewrite a vague feature request", "Draft agent guardrails", "Create a reusable bug-fix prompt"],
    useCases: ["Prompt cleanup", "Team instructions", "Agent handoffs"],
    ru: {
      title: "Prompt Shaper",
      summary: "Точные prompts, переиспользуемые briefs и спокойные инструкции для агентов.",
      description: "Prompting workflow для превращения рыхлых запросов в компактные task briefs, guardrails и повторяемые instruction patterns.",
      tags: ["prompts", "briefs", "instructions"],
      examples: ["Переписать расплывчатый feature request", "Собрать guardrails для агента", "Создать bug-fix prompt"],
      useCases: ["Prompt cleanup", "Team instructions", "Agent handoffs"],
    },
  },
  {
    slug: "docs-polish",
    title: "Docs Polish",
    summary: "Clear README, changelog, and release notes without filler.",
    description:
      "A documentation pass for tightening structure, examples, and release language so project docs stay useful under pressure.",
    category: "Docs",
    emoji: "▱",
    tags: ["README", "release notes", "writing"],
    compatibility: ["Codex", "ChatGPT", "Claude", "Universal"],
    source: "Curated pack",
    install: "codex skills install docs-polish",
    score: 82,
    popularity: 430,
    addedAt: "2026-04-18",
    featured: false,
    difficulty: "Easy",
    risk: "Low",
    hasScripts: false,
    free: true,
    setup: "Zero config",
    marker: "Safe",
    examples: ["Rewrite a README", "Prepare release notes", "Clean setup instructions"],
    useCases: ["Project handoff", "Open-source hygiene", "Launch notes"],
    ru: {
      title: "Docs Polish",
      summary: "Понятные README, changelog и release notes без воды.",
      description: "Documentation pass для структуры, примеров и release language, чтобы docs оставались полезными в рабочем ритме.",
      tags: ["README", "release notes", "writing"],
      examples: ["Переписать README", "Подготовить release notes", "Очистить setup instructions"],
      useCases: ["Project handoff", "Open-source hygiene", "Launch notes"],
    },
  },
  {
    slug: "repo-automation",
    title: "Repo Automation",
    summary: "Small repository chores handled with scripts and checks.",
    description:
      "An automation skill for formatting passes, issue triage, generated reports, and safe mechanical repository work.",
    category: "Automation",
    emoji: "◆",
    tags: ["scripts", "maintenance", "reports"],
    compatibility: ["Codex"],
    source: "Curated pack",
    install: "codex skills install repo-automation",
    score: 83,
    popularity: 470,
    addedAt: "2026-05-01",
    featured: false,
    difficulty: "Advanced",
    risk: "Medium",
    hasScripts: true,
    free: true,
    setup: "Scripted",
    marker: "Script",
    examples: ["Generate a dependency report", "Bulk-format files", "Summarize open issues"],
    useCases: ["Maintenance", "Repository hygiene", "Repeatable checks"],
    ru: {
      title: "Repo Automation",
      summary: "Небольшие repo chores через scripts и checks.",
      description: "Automation skill для formatting passes, issue triage, generated reports и аккуратной mechanical repository work.",
      tags: ["scripts", "maintenance", "reports"],
      examples: ["Собрать dependency report", "Массово отформатировать files", "Суммировать open issues"],
      useCases: ["Maintenance", "Repository hygiene", "Repeatable checks"],
    },
  },
];

export const categoryLabels: Record<Locale, Record<Category | "All", string>> = {
  en: {
    All: "All",
    Frontend: "Frontend",
    Backend: "Backend",
    Design: "Design",
    Testing: "Testing",
    Security: "Security",
    Docs: "Docs",
    Automation: "Automation",
    Research: "Research",
    Data: "Data",
    Productivity: "Productivity",
    Prompting: "Prompting",
    Deployment: "Deployment",
  },
  ru: {
    All: "Все",
    Frontend: "Фронтенд",
    Backend: "Бэкенд",
    Design: "Дизайн",
    Testing: "Тестинг",
    Security: "Безопасность",
    Docs: "Документы",
    Automation: "Автоматизация",
    Research: "Исследования",
    Data: "Данные",
    Productivity: "Продуктивность",
    Prompting: "Промптинг",
    Deployment: "Деплой",
  },
};

export const difficultyLabels: Record<Locale, Record<Difficulty, string>> = {
  en: { Easy: "Easy", Medium: "Medium", Advanced: "Advanced" },
  ru: { Easy: "Легко", Medium: "Средне", Advanced: "Сложно" },
};

export const riskLabels: Record<Locale, Record<Risk, string>> = {
  en: { Low: "Low", Medium: "Medium", High: "High" },
  ru: { Low: "Низкий", Medium: "Средний", High: "Высокий" },
};

export function skillTitle(skill: Skill, locale: Locale) {
  return locale === "ru" ? skill.ru.title : skill.title;
}

export function skillSummary(skill: Skill, locale: Locale) {
  return locale === "ru" ? skill.ru.summary : skill.summary;
}

export function skillDescription(skill: Skill, locale: Locale) {
  return locale === "ru" ? skill.ru.description : skill.description;
}

export function skillTags(skill: Skill, locale: Locale) {
  return locale === "ru" ? skill.ru.tags : skill.tags;
}

export function skillExamples(skill: Skill, locale: Locale) {
  return locale === "ru" ? skill.ru.examples : skill.examples;
}

export function skillUseCases(skill: Skill, locale: Locale) {
  return locale === "ru" ? skill.ru.useCases : skill.useCases;
}

export function getSkill(slug: string) {
  return skills.find((skill) => skill.slug === slug);
}

export function relatedSkills(skill: Skill) {
  return skills
    .filter((candidate) => candidate.slug !== skill.slug)
    .sort((a, b) => {
      const aScore = (a.category === skill.category ? 2 : 0) + a.tags.filter((tag) => skill.tags.includes(tag)).length;
      const bScore = (b.category === skill.category ? 2 : 0) + b.tags.filter((tag) => skill.tags.includes(tag)).length;
      return bScore - aScore || b.score - a.score;
    })
    .slice(0, 3);
}
