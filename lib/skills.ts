export type Category =
  | "Frontend"
  | "Backend"
  | "Design"
  | "Testing"
  | "Security"
  | "Docs"
  | "Automation"
  | "Productivity"
  | "Research"
  | "Data";

export type Skill = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: Category;
  tags: string[];
  compatibility: string[];
  source: string;
  install: string;
  score: number;
  difficulty: "Gentle" | "Focused" | "Advanced";
  setup: "Zero config" | "Light setup" | "Scripted" | "Requires keys";
  marker: "Safe" | "Script" | "Advanced";
  examples: string[];
  useCases: string[];
};

export const categories: Category[] = [
  "Frontend",
  "Backend",
  "Design",
  "Testing",
  "Security",
  "Docs",
  "Automation",
  "Productivity",
  "Research",
  "Data",
];

export const skills: Skill[] = [
  {
    slug: "frontend-design",
    title: "Frontend Design",
    summary: "Production-grade interfaces with a clear visual point of view.",
    description:
      "A design-focused workflow for building polished React, HTML, and app surfaces that feel intentional instead of templated.",
    category: "Design",
    tags: ["UI", "visual systems", "React"],
    compatibility: ["Codex", "Claude", "ChatGPT"],
    source: "System skill",
    install: "codex skills install frontend-design",
    score: 98,
    difficulty: "Focused",
    setup: "Zero config",
    marker: "Safe",
    examples: ["Redesign a product dashboard", "Create a refined landing page", "Polish a component library"],
    useCases: ["Brand-led UI", "High-touch prototypes", "Design QA before shipping"],
  },
  {
    slug: "webapp-testing",
    title: "Webapp Testing",
    summary: "Browser checks, screenshots, and interaction tests for local apps.",
    description:
      "A pragmatic Playwright workflow for inspecting rendered pages, catching console errors, and verifying real user paths.",
    category: "Testing",
    tags: ["Playwright", "screenshots", "QA"],
    compatibility: ["Codex", "Claude"],
    source: "System skill",
    install: "codex skills install webapp-testing",
    score: 95,
    difficulty: "Gentle",
    setup: "Light setup",
    marker: "Script",
    examples: ["Capture mobile screenshots", "Test a checkout flow", "Find broken interactive states"],
    useCases: ["Visual QA", "Regression checks", "Local product reviews"],
  },
  {
    slug: "openai-docs",
    title: "OpenAI Docs",
    summary: "Current official references for OpenAI APIs and models.",
    description:
      "Keeps agent answers grounded in official OpenAI documentation when choosing models, upgrading prompts, or wiring API features.",
    category: "Docs",
    tags: ["API", "models", "official docs"],
    compatibility: ["Codex", "ChatGPT"],
    source: "System skill",
    install: "codex skills install openai-docs",
    score: 92,
    difficulty: "Gentle",
    setup: "Zero config",
    marker: "Safe",
    examples: ["Pick a model for a coding tool", "Update a Responses API flow", "Check latest SDK guidance"],
    useCases: ["API planning", "Migration notes", "Documentation-backed answers"],
  },
  {
    slug: "security-best-practices",
    title: "Security Best Practices",
    summary: "Framework-aware security review for JS, Python, and Go.",
    description:
      "A focused AppSec pass for common coding risks, secure defaults, dependency hygiene, and practical remediation steps.",
    category: "Security",
    tags: ["AppSec", "review", "secure defaults"],
    compatibility: ["Codex", "Claude", "ChatGPT"],
    source: "System skill",
    install: "codex skills install security-best-practices",
    score: 91,
    difficulty: "Focused",
    setup: "Light setup",
    marker: "Advanced",
    examples: ["Review auth handlers", "Harden file uploads", "Audit API input validation"],
    useCases: ["Pre-release checks", "Secure refactors", "Risk-focused reviews"],
  },
  {
    slug: "cloudflare-deploy",
    title: "Cloudflare Deploy",
    summary: "Publish Workers, Pages, and full-stack apps with clean defaults.",
    description:
      "A deployment workflow for taking local web projects to Cloudflare, including configuration, build commands, and checks.",
    category: "Automation",
    tags: ["Cloudflare", "deploy", "Pages"],
    compatibility: ["Codex"],
    source: "Local skill",
    install: "codex skills install cloudflare-deploy",
    score: 89,
    difficulty: "Focused",
    setup: "Requires keys",
    marker: "Script",
    examples: ["Deploy a Next.js app", "Configure Wrangler", "Publish a Worker API"],
    useCases: ["Production previews", "Static sites", "Edge functions"],
  },
  {
    slug: "skill-creator",
    title: "Skill Creator",
    summary: "Turn repeatable agent workflows into reusable skills.",
    description:
      "A structured authoring guide for creating skills with clear triggers, compact instructions, and useful local assets.",
    category: "Productivity",
    tags: ["authoring", "workflows", "agents"],
    compatibility: ["Codex"],
    source: "System skill",
    install: "codex skills install skill-creator",
    score: 88,
    difficulty: "Gentle",
    setup: "Zero config",
    marker: "Safe",
    examples: ["Package a review workflow", "Create a design QA skill", "Document a deployment routine"],
    useCases: ["Team workflows", "Personal automation", "Agent memory"],
  },
  {
    slug: "data-canvas",
    title: "Data Canvas",
    summary: "Shape raw CSV or JSON into readable product-facing views.",
    description:
      "A lightweight data skill for profiling datasets, drafting schemas, and producing chart-ready structures without heavy tooling.",
    category: "Data",
    tags: ["CSV", "JSON", "charts"],
    compatibility: ["Codex", "ChatGPT", "Claude"],
    source: "Curated pack",
    install: "codex skills install data-canvas",
    score: 84,
    difficulty: "Gentle",
    setup: "Light setup",
    marker: "Safe",
    examples: ["Normalize a CSV export", "Draft a chart model", "Find malformed rows"],
    useCases: ["Internal tools", "Reports", "Product analytics"],
  },
  {
    slug: "research-brief",
    title: "Research Brief",
    summary: "Compact source-backed briefs for technical decisions.",
    description:
      "A research workflow that favors primary sources, dated claims, and short decision notes that engineers can act on.",
    category: "Research",
    tags: ["sources", "briefs", "decisions"],
    compatibility: ["Codex", "ChatGPT"],
    source: "Curated pack",
    install: "codex skills install research-brief",
    score: 87,
    difficulty: "Focused",
    setup: "Zero config",
    marker: "Safe",
    examples: ["Compare two libraries", "Summarize a new API", "Prepare a build-vs-buy note"],
    useCases: ["Technical planning", "Vendor checks", "Architecture notes"],
  },
  {
    slug: "backend-routes",
    title: "Backend Routes",
    summary: "Small, reliable API endpoints with validation and tests.",
    description:
      "A backend implementation guide for focused route work, sane input parsing, and minimal-but-real coverage.",
    category: "Backend",
    tags: ["API", "validation", "tests"],
    compatibility: ["Codex", "Claude"],
    source: "Curated pack",
    install: "codex skills install backend-routes",
    score: 86,
    difficulty: "Focused",
    setup: "Light setup",
    marker: "Script",
    examples: ["Add a REST endpoint", "Validate request bodies", "Write contract tests"],
    useCases: ["API slices", "Service cleanup", "Integration work"],
  },
  {
    slug: "accessibility-pass",
    title: "Accessibility Pass",
    summary: "Practical accessibility checks for product UI.",
    description:
      "A compact review workflow for keyboard paths, contrast, labels, focus states, and responsive readability.",
    category: "Frontend",
    tags: ["a11y", "keyboard", "contrast"],
    compatibility: ["Codex", "ChatGPT", "Claude"],
    source: "Curated pack",
    install: "codex skills install accessibility-pass",
    score: 90,
    difficulty: "Gentle",
    setup: "Zero config",
    marker: "Safe",
    examples: ["Audit a settings page", "Fix focus rings", "Check mobile forms"],
    useCases: ["UI reviews", "Design systems", "Release polish"],
  },
];

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
