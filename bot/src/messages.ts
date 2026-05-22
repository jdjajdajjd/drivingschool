import type { Locale, Skill } from "../../lib/skills";
import { categoryLabels, difficultyLabels, riskLabels, skillDescription, skillSummary, skillTitle } from "../../lib/skills";

export const ui = {
  en: {
    welcome: "Codex Skills. Curated skills for coding agents.",
    help: "Open a skill from the site, or use /skill <slug>. Commands: /catalog, /skill, /lang.",
    catalog: "Open catalog",
    channel: "Join channel",
    check: "Check subscription",
    subscribedCheck: "Checking subscription...",
    chooseLang: "Choose language.",
    langSet: "Language set to English.",
    missingSkill: "Skill not found. Open the catalog and try again.",
    missingPack: "Pack not found or expired.",
    packReady: "Skill pack is ready. Choose your agent format:",
    copyPrompt: "Copy this prompt and paste it into your agent.",
    regenerateCodex: "Regenerate for Codex",
    regenerateClaude: "Regenerate for Claude",
    regenerateCursor: "Regenerate for Cursor",
    regenerateUniversal: "Regenerate Universal",
    skillUsage: "Use /skill <slug>. Example: /skill frontend-design",
    joinRequired: (title: string) => `Join the channel to get ${title}.`,
    sourceUnavailable: "Source link is not listed yet.",
    instruction: "Review SKILL.md before running scripts. Use a branch for risky changes.",
    install: "Install command",
    source: "Source",
  },
  ru: {
    welcome: "Codex Skills. Подобранные skills для coding agents.",
    help: "Открой skill с сайта или используй /skill <slug>. Команды: /catalog, /skill, /lang.",
    catalog: "Открыть каталог",
    channel: "Подписаться на канал",
    check: "Проверить подписку",
    subscribedCheck: "Проверяю подписку...",
    chooseLang: "Выбери язык.",
    langSet: "Язык переключен на русский.",
    missingSkill: "Skill не найден. Открой каталог и попробуй снова.",
    missingPack: "Набор не найден или устарел.",
    packReady: "Набор skills готов. Выберите формат агента:",
    copyPrompt: "Скопируйте этот промпт и вставьте его в agent.",
    regenerateCodex: "Собрать для Codex",
    regenerateClaude: "Собрать для Claude",
    regenerateCursor: "Собрать для Cursor",
    regenerateUniversal: "Собрать Universal",
    skillUsage: "Используй /skill <slug>. Пример: /skill frontend-design",
    joinRequired: (title: string) => `Подпишись на канал, чтобы получить ${title}.`,
    sourceUnavailable: "Ссылка на источник пока не указана.",
    instruction: "Проверь SKILL.md перед scripts. Для рискованных изменений используй branch.",
    install: "Команда установки",
    source: "Источник",
  },
} as const;

export function skillMessage(skill: Skill, locale: Locale) {
  const t = ui[locale];
  const source = skill.sourceUrl || t.sourceUnavailable;
  return [
    `${skill.emoji} <b>${escapeHtml(skillTitle(skill, locale))}</b>`,
    escapeHtml(skillDescription(skill, locale)),
    "",
    `<b>${t.install}</b>`,
    `<code>${escapeHtml(skill.install)}</code>`,
    "",
    `<b>${t.source}</b>`,
    escapeHtml(source),
    "",
    escapeHtml(t.instruction),
  ].join("\n");
}

export function skillCard(skill: Skill, locale: Locale) {
  return [
    `${skill.emoji} ${skillTitle(skill, locale)}`,
    skillSummary(skill, locale),
    `${categoryLabels[locale][skill.category]} · ${difficultyLabels[locale][skill.difficulty]} · ${riskLabels[locale][skill.risk]}`,
  ].join("\n");
}

export function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
