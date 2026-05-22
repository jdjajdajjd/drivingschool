import { getSkill, skillTitle, type Locale, type Skill } from "./skills";

export type AgentFormat = "codex" | "claude" | "cursor" | "universal";

export type StoredPack = {
  packId: string;
  slugs: string[];
  createdAt: string;
  expiresAt?: string;
  language?: Locale;
  source?: string;
};

const formatNames: Record<AgentFormat, string> = {
  codex: "Codex",
  claude: "Claude",
  cursor: "Cursor",
  universal: "Universal",
};

export function resolvePackSkills(pack: StoredPack) {
  return pack.slugs.map((slug) => getSkill(slug)).filter(Boolean) as Skill[];
}

export function buildAgentPrompt(pack: StoredPack, format: AgentFormat, locale: Locale = "en") {
  const selected = resolvePackSkills(pack);
  const title = `Codex Skills Pack ${pack.packId}`;
  const intro = formatIntro(format);
  const skillList = selected.map((skill, index) => [
    `${index + 1}. ${skill.emoji} ${skillTitle(skill, locale)}`,
    `Purpose: ${skill.promptPurpose || skill.description}`,
    skill.agentInstructions.length ? `Use it to: ${skill.agentInstructions.slice(0, 3).join(" ")}` : undefined,
  ].filter(Boolean).join("\n")).join("\n\n");

  return [
    intro,
    "",
    `You are working with the following skill pack: ${title}`,
    "",
    skillList,
    "",
    "Task:",
    taskLine(format),
    "",
    "Workflow:",
    ...workflow(format).map((item, index) => `${index + 1}. ${item}`),
    "",
    "How to apply the selected skills:",
    ...selected.flatMap((skill) => [
      `- ${skill.emoji} ${skillTitle(skill, locale)}: ${skill.bestFor.slice(0, 3).join(", ")}.`,
    ]),
    "",
    "Rules:",
    ...rules(format),
    ...selected.flatMap((skill) => skill.constraints.slice(0, 2).map((item) => `- ${item}`)),
    "",
    "Final response:",
    "- Summary of changes.",
    "- Files changed.",
    "- What was tested.",
    "- Remaining issues or risks.",
  ].join("\n");
}

export function agentLabel(format: AgentFormat) {
  return formatNames[format];
}

function formatIntro(format: AgentFormat) {
  if (format === "codex") return "You are an OpenAI Codex coding agent. Work concretely, keep changes focused, and verify the result.";
  if (format === "claude") return "You are Claude / Claude Code. Start with structure, use project context carefully, then implement and verify.";
  if (format === "cursor") return "You are working in Cursor inside an existing codebase. Inspect first, edit second, verify before reporting.";
  return "You are an AI coding agent. Apply the selected skills carefully to the current project.";
}

function taskLine(format: AgentFormat) {
  if (format === "cursor") return "Study the current codebase, then apply these skills through small, high-quality edits.";
  if (format === "claude") return "Apply these skills to the current project using a plan, implementation pass, and verification pass.";
  return "Apply these skills to the current project.";
}

function workflow(format: AgentFormat) {
  if (format === "claude") return [
    "Inspect relevant files and summarize the current state.",
    "Create a short plan tied to the selected skills.",
    "Implement focused changes without rewriting unrelated parts.",
    "Verify behavior, types, tests, and responsive UI where relevant.",
    "Report what changed, what was tested, and any remaining risks.",
  ];
  if (format === "cursor") return [
    "Map the project structure and identify the files most likely to matter.",
    "Find issues related to the selected skills before editing.",
    "Make focused code changes that fit existing patterns.",
    "Check for errors, broken imports, and affected user flows.",
    "Explain the changed files and verification results.",
  ];
  return [
    "Inspect the current state.",
    "Identify issues related to the selected skills.",
    "Create a short plan.",
    "Make focused changes.",
    "Verify the result.",
    "Report what changed and what still needs work.",
  ];
}

function rules(format: AgentFormat) {
  const base = [
    "- Do not rewrite unrelated parts.",
    "- Do not add unnecessary features.",
    "- Keep the design system and code style consistent.",
    "- Prefer small, high-quality changes.",
    "- Check desktop and mobile when UI is affected.",
    "- Mention risks before destructive changes.",
  ];
  if (format === "codex") return [...base, "- Use repository tools and tests when available."];
  if (format === "claude") return [...base, "- Use context files deliberately and avoid broad assumptions."];
  if (format === "cursor") return [...base, "- Keep edits scoped to the files you inspected."];
  return base;
}
